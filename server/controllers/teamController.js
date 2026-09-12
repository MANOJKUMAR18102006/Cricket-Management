import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import { notifyTeamAdded, notifyTeamRemoved } from '../services/notificationService.js';
import { getPlayerForUser } from '../services/privacyService.js';

/**
 * @desc    Get all teams where the authenticated user is a member/captain
 * @route   GET /api/teams/my
 * @access  Private (Authenticated users)
 */
export const getMyTeams = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no user found',
      });
    }

    // Resolve player record for authenticated user
    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(200).json({
        success: true,
        count: 0,
        teams: [],
        captainTeams: [],
        memberTeams: [],
      });
    }

    const playerId = player._id;
    const { search, city } = req.query;

    // A team belongs in My Teams when current player is captain or accepted member
    const baseMembershipFilter = [
      { captain: playerId },
      { members: playerId },
    ];

    const query = {
      $or: baseMembershipFilter,
    };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        { $or: baseMembershipFilter },
        {
          $or: [
            { name: searchRegex },
            { city: searchRegex },
            { description: searchRegex },
          ],
        },
      ];
      delete query.$or;
    }

    if (city && city.trim() !== 'all') {
      query.city = new RegExp(`^${city.trim()}$`, 'i');
    }

    const teams = await Team.find(query)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('createdBy', 'username role')
      .sort({ updatedAt: -1 })
      .lean();

    // Enrich each team with match records and player's specific role
    const enrichedTeams = await Promise.all(
      teams.map(async (team) => {
        const matchesCount = await Match.countDocuments({
          $or: [{ team1: team.name }, { team2: team.name }],
        });

        const wins = await Match.countDocuments({
          winner: team.name,
          status: 'completed',
        });

        const losses = await Match.countDocuments({
          status: 'completed',
          winner: { $ne: '', $ne: team.name },
          $or: [{ team1: team.name }, { team2: team.name }],
        });

        // Determine player's role in this team
        const isCaptain = team.captain && String(team.captain._id || team.captain) === String(playerId);
        const isViceCaptain = team.viceCaptain && String(team.viceCaptain._id || team.viceCaptain) === String(playerId);

        let playerRole = 'Member';
        if (isCaptain) {
          playerRole = 'Captain';
        } else if (isViceCaptain) {
          playerRole = 'Vice Captain';
        }

        return {
          ...team,
          membersCount: team.members ? team.members.length : 0,
          isCaptain,
          isViceCaptain,
          playerRole,
          stats: {
            matchesCount,
            wins,
            losses,
          },
        };
      })
    );

    const captainTeams = enrichedTeams.filter((t) => t.isCaptain);
    const memberTeams = enrichedTeams.filter((t) => !t.isCaptain);

    res.status(200).json({
      success: true,
      count: enrichedTeams.length,
      teams: enrichedTeams,
      captainTeams,
      memberTeams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 * @access  Private (Authenticated users)
 */
export const createTeam = async (req, res, next) => {
  try {
    const { name, city, description, logo, captain, viceCaptain } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required',
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: `Team with name "${name.trim()}" already exists`,
      });
    }

    // Identify creator's player profile (safely auto-creates if not yet initialized)
    const creatorPlayer = await getPlayerForUser(req.user);

    const initialMembers = [];
    if (creatorPlayer) {
      initialMembers.push(creatorPlayer._id);
    }

    // Default captain assignment
    let designatedCaptain = captain || null;
    if (!designatedCaptain && creatorPlayer) {
      designatedCaptain = creatorPlayer._id;
    }

    if (
      designatedCaptain &&
      viceCaptain &&
      designatedCaptain.toString() === viceCaptain.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: 'The player selected as Captain cannot also be appointed as Vice Captain',
      });
    }

    const team = await Team.create({
      name: name.trim(),
      city: city.trim(),
      description: description ? description.trim() : '',
      logo: logo || '',
      captain: designatedCaptain,
      viceCaptain: viceCaptain || null,
      createdBy: req.user._id,
      members: initialMembers,
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('createdBy', 'username role');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teams with search, filter, and pagination
 * @route   GET /api/teams
 * @access  Public
 */
export const getTeams = async (req, res, next) => {
  try {
    const { search, city, page = 1, limit = 12 } = req.query;

    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { city: searchRegex }, { description: searchRegex }];
    }

    if (city && city.trim() !== 'all') {
      query.city = new RegExp(city.trim(), 'i');
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    const total = await Team.countDocuments(query);

    const teams = await Team.find(query)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('createdBy', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Enrich teams with match records
    const enrichedTeams = await Promise.all(
      teams.map(async (team) => {
        const matchesCount = await Match.countDocuments({
          $or: [{ team1: team.name }, { team2: team.name }],
        });

        const wins = await Match.countDocuments({
          winner: team.name,
          status: 'completed',
        });

        const losses = await Match.countDocuments({
          status: 'completed',
          winner: { $ne: '', $ne: team.name },
          $or: [{ team1: team.name }, { team2: team.name }],
        });

        return {
          ...team,
          membersCount: team.members ? team.members.length : 0,
          stats: {
            matchesCount,
            wins,
            losses,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedTeams.length,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      currentPage: pageNumber,
      limit: pageSize,
      teams: enrichedTeams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get team by ID with members and match performance
 * @route   GET /api/teams/:id
 * @access  Public
 */
export const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID format.',
      });
    }

    const team = await Team.findById(id)
      .populate({
        path: 'captain',
        select: 'displayName profileImage playingRole battingStyle bowlingStyle jerseyNumber userId',
        populate: { path: 'userId', select: 'username' },
      })
      .populate({
        path: 'viceCaptain',
        select: 'displayName profileImage playingRole battingStyle bowlingStyle jerseyNumber userId',
        populate: { path: 'userId', select: 'username' },
      })
      .populate({
        path: 'members',
        select: 'displayName profileImage playingRole battingStyle bowlingStyle jerseyNumber city userId',
        populate: { path: 'userId', select: 'username' },
      })
      .populate('createdBy', 'username role');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Match statistics from Match collection
    const matchesQuery = {
      $or: [{ team1: team.name }, { team2: team.name }],
    };

    const totalMatches = await Match.countDocuments(matchesQuery);

    const wins = await Match.countDocuments({
      winner: team.name,
      status: 'completed',
    });

    const losses = await Match.countDocuments({
      status: 'completed',
      winner: { $ne: '', $ne: team.name },
      $or: [{ team1: team.name }, { team2: team.name }],
    });

    const completedMatches = wins + losses;
    const winRate = completedMatches > 0 ? Math.round((wins / completedMatches) * 100) : 0;

    const recentMatches = await Match.find(matchesQuery)
      .sort({ date: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      team,
      stats: {
        matchesCount: totalMatches,
        wins,
        losses,
        winRate,
      },
      recentMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update team details, set captain, set vice captain
 * @route   PUT /api/teams/:id
 * @access  Private (Creator, Captain, or Admin)
 */
export const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID format.',
      });
    }

    const { name, city, description, logo, captain, viceCaptain } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Authorization check
    let isAuthorized = false;
    if (req.user.role === 'admin') {
      isAuthorized = true;
    } else if (team.createdBy.toString() === req.user._id.toString()) {
      isAuthorized = true;
    } else {
      const userPlayer = await Player.findOne({ userId: req.user._id });
      if (userPlayer && team.captain && team.captain.toString() === userPlayer._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this team',
      });
    }

    // If name is changed, check for conflict
    if (name && name.trim() !== team.name) {
      const nameConflict = await Team.findOne({
        _id: { $ne: team._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: `Team name "${name.trim()}" is already in use`,
        });
      }
      team.name = name.trim();
    }

    if (city !== undefined) team.city = city.trim();
    if (description !== undefined) team.description = description.trim();
    if (logo !== undefined) team.logo = logo;

    // Validate and set Captain
    if (captain !== undefined) {
      if (captain === null || captain === '') {
        team.captain = null;
      } else {
        const playerExists = await Player.findById(captain);
        if (!playerExists) {
          return res.status(400).json({
            success: false,
            message: 'Designated captain player not found',
          });
        }
        // If captain not in members, add to members
        const isMember = team.members.some((m) => m.toString() === captain.toString());
        if (!isMember) {
          team.members.push(captain);
        }
        team.captain = captain;
      }
    }

    // Validate and set Vice Captain
    if (viceCaptain !== undefined) {
      if (viceCaptain === null || viceCaptain === '') {
        team.viceCaptain = null;
      } else {
        const playerExists = await Player.findById(viceCaptain);
        if (!playerExists) {
          return res.status(400).json({
            success: false,
            message: 'Designated vice captain player not found',
          });
        }
        // If viceCaptain not in members, add to members
        const isMember = team.members.some((m) => m.toString() === viceCaptain.toString());
        if (!isMember) {
          team.members.push(viceCaptain);
        }
        team.viceCaptain = viceCaptain;
      }
    }

    // Prevent captain from being appointed as vice captain
    if (
      team.captain &&
      team.viceCaptain &&
      team.captain.toString() === team.viceCaptain.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: 'The player selected as Captain cannot also be appointed as Vice Captain',
      });
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('members', 'displayName profileImage playingRole city')
      .populate('createdBy', 'username role');

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      team: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a team
 * @route   DELETE /api/teams/:id
 * @access  Private (Creator or Admin)
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID format.',
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const isCreator = team.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this team',
      });
    }

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add player to team members
 * @route   POST /api/teams/:id/members/:playerId
 * @access  Private (Creator, Captain, or Admin)
 */
export const addMember = async (req, res, next) => {
  try {
    const { id, playerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID or player ID format.',
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Authorization check
    let isAuthorized = false;
    if (req.user.role === 'admin') {
      isAuthorized = true;
    } else if (team.createdBy.toString() === req.user._id.toString()) {
      isAuthorized = true;
    } else {
      const userPlayer = await Player.findOne({ userId: req.user._id });
      if (userPlayer && team.captain && team.captain.toString() === userPlayer._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add members to this team',
      });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    // Check if player is already a member
    const alreadyMember = team.members.some((m) => m.toString() === playerId.toString());
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: `${player.displayName} is already a member of this team`,
      });
    }

    team.members.push(player._id);

    // If team has no captain yet, set this player as captain
    if (!team.captain) {
      team.captain = player._id;
    }

    await team.save();

    // Dispatch team added notification
    try {
      const senderPlayer = await Player.findOne({ userId: req.user._id });
      await notifyTeamAdded({
        player,
        team,
        senderPlayer,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch team_added notification:', notifErr.message);
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('members', 'displayName profileImage playingRole city');

    res.status(200).json({
      success: true,
      message: `${player.displayName} added to squad`,
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove player from team members
 * @route   DELETE /api/teams/:id/members/:playerId
 * @access  Private (Creator, Captain, Admin, or the player himself)
 */
export const removeMember = async (req, res, next) => {
  try {
    const { id, playerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID or player ID format.',
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is the player himself
    const userPlayer = await Player.findOne({ userId: req.user._id });
    const isSelf = userPlayer && userPlayer._id.toString() === playerId.toString();
    const isCreator = team.createdBy.toString() === req.user._id.toString();
    const isCaptain = userPlayer && team.captain && team.captain.toString() === userPlayer._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isCaptain && !isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this player from the team',
      });
    }

    const memberIndex = team.members.findIndex((m) => m.toString() === playerId.toString());
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Player is not a member of this team',
      });
    }

    team.members.splice(memberIndex, 1);

    // Clear captain/viceCaptain if this player held the role
    if (team.captain && team.captain.toString() === playerId.toString()) {
      team.captain = null;
    }
    if (team.viceCaptain && team.viceCaptain.toString() === playerId.toString()) {
      team.viceCaptain = null;
    }

    await team.save();

    // Dispatch team removed notification (if not removed by himself)
    try {
      if (!isSelf) {
        const senderPlayer = await Player.findOne({ userId: req.user._id });
        await notifyTeamRemoved({
          player: playerId,
          team,
          senderPlayer,
        });
      }
    } catch (notifErr) {
      console.warn('Failed to dispatch team_removed notification:', notifErr.message);
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('captain', 'displayName profileImage playingRole')
      .populate('viceCaptain', 'displayName profileImage playingRole')
      .populate('members', 'displayName profileImage playingRole city');

    res.status(200).json({
      success: true,
      message: 'Player removed from squad',
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};
