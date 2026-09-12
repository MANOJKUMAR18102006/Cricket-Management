import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import TournamentInvitation from '../models/TournamentInvitation.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Player from '../models/Player.js';
import { getPlayerForUser } from '../services/privacyService.js';

/**
 * Helper to parse cricket overs string (e.g., "19.4" -> balls = 19*6 + 4 = 118 -> oversDecimal = 118 / 6)
 */
const oversToDecimal = (oversStr, allOut = false, matchMaxOvers = 20) => {
  if (allOut) return matchMaxOvers;
  if (!oversStr) return 0;
  const parts = String(oversStr).split('.');
  const completedOvers = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return completedOvers + balls / 6;
};

/**
 * @desc    Create a new tournament
 * @route   POST /api/tournaments
 * @access  Private (Authenticated users)
 */
export const createTournament = async (req, res, next) => {
  try {
    const {
      name,
      description,
      logo,
      banner,
      location,
      venue,
      city,
      format,
      overs,
      startDate,
      endDate,
      maxTeams,
      status,
    } = req.body;

    const resolvedLocation = (location || venue || '').trim();

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tournament name is required' });
    }

    if (!resolvedLocation) {
      return res.status(400).json({ success: false, message: 'Location/venue is required' });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date' });
    }

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    // Check for duplicate name
    const existing = await Tournament.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Tournament "${name.trim()}" already exists`,
      });
    }

    const defaultOvers = format === 'T10' ? 10 : format === 'ODI' ? 50 : 20;

    const tournament = await Tournament.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      logo: logo || '',
      banner: banner || '',
      organizer: req.user._id,
      location: resolvedLocation,
      city: city.trim(),
      format: format || 'T20',
      overs: overs ? Math.max(1, parseInt(overs, 10)) : defaultOvers,
      startDate: start,
      endDate: end,
      status: status || 'upcoming',
      maxTeams: maxTeams ? Math.max(2, Math.min(64, parseInt(maxTeams, 10))) : 8,
      teams: [],
    });

    const populated = await Tournament.findById(tournament._id)
      .populate('organizer', 'username email role city')
      .populate('teams', 'name city logo captain members');

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      tournament: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournaments with search, filter, and pagination
 * @route   GET /api/tournaments
 * @access  Public
 */
export const getTournaments = async (req, res, next) => {
  try {
    const { search, status, format, city, page = 1, limit = 12 } = req.query;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { city: regex }, { location: regex }];
    }

    if (status && status.trim() && status.toLowerCase() !== 'all') {
      query.status = status.trim().toLowerCase();
    }

    if (format && format.trim() && format.toLowerCase() !== 'all') {
      query.format = format.trim();
    }

    if (city && city.trim() && city.toLowerCase() !== 'all') {
      query.city = new RegExp(city.trim(), 'i');
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    const total = await Tournament.countDocuments(query);

    const tournaments = await Tournament.find(query)
      .populate('organizer', 'username role city')
      .populate({
        path: 'teams',
        select: 'name city logo captain members',
        populate: { path: 'captain', select: 'displayName profileImage' },
      })
      .sort({ startDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    res.status(200).json({
      success: true,
      count: tournaments.length,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      currentPage: pageNumber,
      tournaments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's organized or participating tournaments
 * @route   GET /api/tournaments/my
 * @access  Private
 */
export const getMyTournaments = async (req, res, next) => {
  try {
    const { search, status, format, city } = req.query;
    const player = await getPlayerForUser(req.user);

    // Find teams where user/player is captain, creator, or member
    let userTeams = [];
    let userTeamIds = [];
    if (player) {
      userTeams = await Team.find({
        $or: [{ members: player._id }, { captain: player._id }, { createdBy: req.user._id }],
      }).select('_id name');
      userTeamIds = userTeams.map((t) => t._id);
    }

    const baseCondition = {
      $or: [{ organizer: req.user._id }, { teams: { $in: userTeamIds } }],
    };

    const filterConditions = [];

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filterConditions.push({
        $or: [{ name: regex }, { city: regex }, { location: regex }],
      });
    }

    if (status && status.trim() && status.toLowerCase() !== 'all') {
      filterConditions.push({ status: status.trim().toLowerCase() });
    }

    if (format && format.trim() && format.toLowerCase() !== 'all') {
      filterConditions.push({ format: format.trim() });
    }

    if (city && city.trim() && city.toLowerCase() !== 'all') {
      filterConditions.push({ city: new RegExp(city.trim(), 'i') });
    }

    const finalQuery = filterConditions.length > 0
      ? { $and: [baseCondition, ...filterConditions] }
      : baseCondition;

    const tournaments = await Tournament.find(finalQuery)
      .populate('organizer', 'username role city')
      .populate({
        path: 'teams',
        select: 'name city logo captain members',
        populate: { path: 'captain', select: 'displayName profileImage' },
      })
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    // Mark participation role and which team is participating
    const enriched = tournaments.map((t) => {
      const isOrganizer = String(t.organizer?._id || t.organizer) === String(req.user._id);
      const participatingTeams = (t.teams || []).filter((team) =>
        userTeamIds.some((userTeamId) => String(userTeamId) === String(team._id || team))
      );
      const isParticipating = participatingTeams.length > 0;

      let role = 'Participant';
      if (isOrganizer && isParticipating) {
        role = 'Organizer & Participant';
      } else if (isOrganizer) {
        role = 'Organizer';
      } else if (isParticipating) {
        role = 'Team Participant';
      }

      return {
        ...t,
        myRole: role,
        userRole: role,
        isOrganizer,
        isParticipating,
        participatingTeams,
        participatingTeamName: participatingTeams[0]?.name || '',
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      tournaments: enriched,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament by ID with details
 * @route   GET /api/tournaments/:id
 * @access  Public
 */
export const getTournamentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id)
      .populate('organizer', 'username email role city')
      .populate({
        path: 'teams',
        select: 'name city logo description captain members',
        populate: { path: 'captain', select: 'displayName profileImage playingRole' },
      });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Count matches
    const totalMatches = await Match.countDocuments({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
    });
    const completedMatches = await Match.countDocuments({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
      status: 'completed',
    });
    const liveMatches = await Match.countDocuments({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
      status: 'live',
    });

    res.status(200).json({
      success: true,
      tournament,
      stats: {
        totalMatches,
        completedMatches,
        liveMatches,
        teamsCount: tournament.teams ? tournament.teams.length : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tournament (Organizer or Admin only)
 * @route   PUT /api/tournaments/:id
 * @access  Private
 */
export const updateTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Check authorization
    const isOrganizer = String(tournament.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can modify tournament settings',
      });
    }

    // If completed or cancelled, prevent non-admin modifications
    if ((tournament.status === 'completed' || tournament.status === 'cancelled') && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a tournament with status "${tournament.status}"`,
      });
    }

    const allowedUpdates = [
      'name',
      'description',
      'logo',
      'banner',
      'location',
      'city',
      'format',
      'overs',
      'startDate',
      'endDate',
      'status',
      'maxTeams',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        tournament[field] = req.body[field];
      }
    });

    if (req.body.startDate && req.body.endDate) {
      if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date',
        });
      }
    }

    await tournament.save();

    const updated = await Tournament.findById(tournament._id)
      .populate('organizer', 'username role')
      .populate('teams', 'name city logo captain');

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully',
      tournament: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or cancel a tournament
 * @route   DELETE /api/tournaments/:id
 * @access  Private (Organizer or Admin)
 */
export const deleteTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const isOrganizer = String(tournament.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can delete this tournament',
      });
    }

    // Check if matches exist
    const matchCount = await Match.countDocuments({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
    });

    if (matchCount > 0) {
      // Soft cancel to preserve match histories
      tournament.status = 'cancelled';
      await tournament.save();
      return res.status(200).json({
        success: true,
        message: 'Tournament has existing matches and was marked as cancelled to preserve records',
        tournament,
      });
    }

    await TournamentInvitation.deleteMany({ tournament: tournament._id });
    await Tournament.findByIdAndDelete(tournament._id);

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send tournament invitation to a team
 * @route   POST /api/tournaments/:tournamentId/invitations
 * @access  Private (Organizer only)
 */
export const sendTournamentInvitation = async (req, res, next) => {
  try {
    const tournamentId = req.params.tournamentId || req.params.id;
    const { teamId, message } = req.body;

    if (!tournamentId || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ success: false, message: 'Valid team ID is required' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const isOrganizer = String(tournament.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can invite teams',
      });
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot invite teams to a ${tournament.status} tournament`,
      });
    }

    // Check max teams capacity
    if (tournament.teams && tournament.teams.length >= tournament.maxTeams) {
      return res.status(400).json({
        success: false,
        message: `Tournament is already full (maximum ${tournament.maxTeams} teams reached)`,
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if team is already participating
    const isAlreadyParticipating = tournament.teams.some((t) => String(t._id || t) === String(team._id));
    if (isAlreadyParticipating) {
      return res.status(400).json({
        success: false,
        message: 'This team is already a registered participant in the tournament',
      });
    }

    // Check for existing pending or accepted invitation
    const existing = await TournamentInvitation.findOne({
      tournament: tournament._id,
      team: team._id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'A pending invitation has already been sent to this team',
        });
      }
      if (existing.status === 'accepted') {
        return res.status(409).json({
          success: false,
          message: 'This team has already accepted an invitation to this tournament',
        });
      }
    }

    const invitation = await TournamentInvitation.create({
      tournament: tournament._id,
      team: team._id,
      invitedBy: req.user._id,
      status: 'pending',
      message: message && message.trim() ? message.trim() : 'You are invited to participate in this tournament.',
    });

    const populated = await TournamentInvitation.findById(invitation._id)
      .populate('team', 'name city logo captain')
      .populate('tournament', 'name city format overs startDate');

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${team.name} successfully`,
      invitation: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament invitation history for organizer
 * @route   GET /api/tournaments/:tournamentId/invitations
 * @access  Private (Organizer only)
 */
export const getTournamentInvitations = async (req, res, next) => {
  try {
    const tournamentId = req.params.tournamentId || req.params.id;

    if (!tournamentId || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const isOrganizer = String(tournament.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can view invitation history',
      });
    }

    const invitations = await TournamentInvitation.find({ tournament: tournament._id })
      .populate({
        path: 'team',
        select: 'name city logo captain members',
        populate: { path: 'captain', select: 'displayName profileImage' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a tournament match fixture
 * @route   POST /api/tournaments/:id/matches
 * @access  Private (Organizer only)
 */
export const createTournamentFixture = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.tournamentId;
    const {
      team1,
      team2,
      team1Id,
      team2Id,
      date,
      matchDate,
      venue,
      city,
      overs,
      format,
      matchType,
      round,
    } = req.body;

    const rawTeam1 = team1 || team1Id;
    const rawTeam2 = team2 || team2Id;
    const scheduledDate = date || matchDate;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id).populate('teams', 'name _id');
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const isOrganizer = String(tournament.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can schedule match fixtures',
      });
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule matches in a ${tournament.status} tournament`,
      });
    }

    if (!rawTeam1 || !rawTeam2) {
      return res.status(400).json({ success: false, message: 'Both Team 1 and Team 2 are required' });
    }

    // Resolve team 1 name
    let team1Name = '';
    if (mongoose.Types.ObjectId.isValid(rawTeam1)) {
      const found = tournament.teams.find((t) => String(t._id) === String(rawTeam1));
      team1Name = found ? found.name : '';
    } else {
      team1Name = String(rawTeam1).trim();
    }

    // Resolve team 2 name
    let team2Name = '';
    if (mongoose.Types.ObjectId.isValid(rawTeam2)) {
      const found = tournament.teams.find((t) => String(t._id) === String(rawTeam2));
      team2Name = found ? found.name : '';
    } else {
      team2Name = String(rawTeam2).trim();
    }

    if (!team1Name || !team2Name) {
      return res.status(400).json({
        success: false,
        message: 'Both teams must be registered tournament participants',
      });
    }

    if (team1Name.toLowerCase() === team2Name.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'A team cannot play against itself',
      });
    }

    // Verify both teams belong to the tournament
    const tournamentTeamNames = tournament.teams.map((t) => t.name.toLowerCase());
    if (!tournamentTeamNames.includes(team1Name.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Team "${team1Name}" is not a registered participant in this tournament`,
      });
    }

    if (!tournamentTeamNames.includes(team2Name.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Team "${team2Name}" is not a registered participant in this tournament`,
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'Match date is required' });
    }

    const match = await Match.create({
      team1: team1Name,
      team2: team2Name,
      tournament: tournament.name,
      tournamentId: tournament._id,
      format: format || tournament.format || 'T20',
      overs: overs ? parseInt(overs, 10) : tournament.overs || 20,
      venue: venue ? venue.trim() : tournament.location,
      city: city ? city.trim() : tournament.city,
      date: new Date(scheduledDate),
      status: 'scheduled',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Tournament fixture created successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tournament matches
 * @route   GET /api/tournaments/:id/matches
 * @access  Public
 */
export const getTournamentMatches = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const matches = await Match.find({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
    }).sort({ date: 1, createdAt: -1 });

    const live = matches.filter((m) => m.status === 'live');
    const upcoming = matches.filter((m) => m.status === 'scheduled');
    const completed = matches.filter((m) => m.status === 'completed');

    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
      categorized: {
        live,
        upcoming,
        completed,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament points table with accurate Net Run Rate (NRR)
 * @route   GET /api/tournaments/:id/points-table
 * @access  Public
 */
export const getTournamentPointsTable = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id).populate('teams', 'name logo city');
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Initialize map for each participating team
    const standingsMap = new Map();

    (tournament.teams || []).forEach((t) => {
      standingsMap.set(t.name.toLowerCase(), {
        teamId: t._id,
        teamName: t.name,
        logo: t.logo || '',
        city: t.city || '',
        P: 0, // Played
        W: 0, // Won
        L: 0, // Lost
        T: 0, // Tied
        NR: 0, // No Result
        PTS: 0, // Points
        runsScored: 0,
        oversFaced: 0,
        runsConceded: 0,
        oversBowled: 0,
        NRR: 0.0,
      });
    });

    // Find all completed matches in this tournament
    const completedMatches = await Match.find({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
      status: 'completed',
    });

    const matchIds = completedMatches.map((m) => m._id);
    const allInnings = await Innings.find({
      $or: [{ match: { $in: matchIds } }, { matchId: { $in: matchIds } }],
    });

    completedMatches.forEach((match) => {
      const t1Key = match.team1.trim().toLowerCase();
      const t2Key = match.team2.trim().toLowerCase();

      // Ensure standings entry exists even if team was not in initial teams list
      if (!standingsMap.has(t1Key)) {
        standingsMap.set(t1Key, {
          teamName: match.team1,
          P: 0,
          W: 0,
          L: 0,
          T: 0,
          NR: 0,
          PTS: 0,
          runsScored: 0,
          oversFaced: 0,
          runsConceded: 0,
          oversBowled: 0,
          NRR: 0.0,
        });
      }
      if (!standingsMap.has(t2Key)) {
        standingsMap.set(t2Key, {
          teamName: match.team2,
          P: 0,
          W: 0,
          L: 0,
          T: 0,
          NR: 0,
          PTS: 0,
          runsScored: 0,
          oversFaced: 0,
          runsConceded: 0,
          oversBowled: 0,
          NRR: 0.0,
        });
      }

      const team1Stats = standingsMap.get(t1Key);
      const team2Stats = standingsMap.get(t2Key);

      team1Stats.P += 1;
      team2Stats.P += 1;

      // Points & Result Assignment
      if (match.winner) {
        const winnerKey = match.winner.trim().toLowerCase();
        const t1IdStr = String(team1Stats.teamId || '').toLowerCase();
        const t2IdStr = String(team2Stats.teamId || '').toLowerCase();

        if (winnerKey === t1Key || (t1IdStr && winnerKey === t1IdStr)) {
          team1Stats.W += 1;
          team1Stats.PTS += 2;
          team2Stats.L += 1;
        } else if (winnerKey === t2Key || (t2IdStr && winnerKey === t2IdStr)) {
          team2Stats.W += 1;
          team2Stats.PTS += 2;
          team1Stats.L += 1;
        } else {
          // Unclear winner or tie
          team1Stats.T += 1;
          team1Stats.PTS += 1;
          team2Stats.T += 1;
          team2Stats.PTS += 1;
        }
      } else {
        // No result or tie
        team1Stats.NR += 1;
        team1Stats.PTS += 1;
        team2Stats.NR += 1;
        team2Stats.PTS += 1;
      }

      // NRR Calculation using Innings
      const matchInnings = allInnings.filter(
        (inn) => String(inn.match || inn.matchId) === String(match._id)
      );
      const inn1 = matchInnings.find((i) => i.inningsNumber === 1);
      const inn2 = matchInnings.find((i) => i.inningsNumber === 2);

      if (inn1 && inn2) {
        const inn1Team = (inn1.battingTeam || inn1.team || '').trim().toLowerCase();
        const battingT1 = inn1Team === t1Key ? inn1 : inn2;
        const battingT2 = inn1Team === t2Key ? inn1 : inn2;

        const maxOvers = match.overs || tournament.overs || 20;

        // Team 1 Batting
        const t1AllOut = battingT1.wickets >= 10;
        const t1OversFaced = oversToDecimal(battingT1.overs, t1AllOut, maxOvers);
        team1Stats.runsScored += battingT1.totalRuns || 0;
        team1Stats.oversFaced += t1OversFaced;
        team2Stats.runsConceded += battingT1.totalRuns || 0;
        team2Stats.oversBowled += t1OversFaced;

        // Team 2 Batting
        const t2AllOut = battingT2.wickets >= 10;
        const t2OversFaced = oversToDecimal(battingT2.overs, t2AllOut, maxOvers);
        team2Stats.runsScored += battingT2.totalRuns || 0;
        team2Stats.oversFaced += t2OversFaced;
        team1Stats.runsConceded += battingT2.totalRuns || 0;
        team1Stats.oversBowled += t2OversFaced;
      }
    });

    // Compute NRR for each team
    const pointsTable = Array.from(standingsMap.values()).map((t) => {
      const forRate = t.oversFaced > 0 ? t.runsScored / t.oversFaced : 0;
      const againstRate = t.oversBowled > 0 ? t.runsConceded / t.oversBowled : 0;
      const netRate = forRate - againstRate;
      const formattedNRR = (netRate >= 0 ? '+' : '') + netRate.toFixed(3);

      return {
        ...t,
        played: t.P,
        won: t.W,
        lost: t.L,
        tied: t.T,
        nr: t.NR,
        points: t.PTS,
        nrr: formattedNRR,
        NRR: parseFloat(netRate.toFixed(3)),
        forRate: parseFloat(forRate.toFixed(2)),
        againstRate: parseFloat(againstRate.toFixed(2)),
      };
    });

    // Sort by PTS desc, then NRR desc, then W desc
    pointsTable.sort((a, b) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS;
      if (b.NRR !== a.NRR) return b.NRR - a.NRR;
      return b.W - a.W;
    });

    // Assign POS (1, 2, 3...)
    const rankedTable = pointsTable.map((team, idx) => ({
      pos: idx + 1,
      ...team,
    }));

    res.status(200).json({
      success: true,
      tournament: {
        id: tournament._id,
        name: tournament.name,
      },
      pointsTable: rankedTable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament specific player leaderboards
 * @route   GET /api/tournaments/:id/leaderboard
 * @access  Public
 */
export const getTournamentLeaderboard = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tournament ID' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Matches strictly for this tournament
    const tournamentMatches = await Match.find({
      $or: [{ tournamentId: tournament._id }, { tournament: tournament.name }],
    }).select('_id');

    const matchIds = tournamentMatches.map((m) => m._id);

    if (matchIds.length === 0) {
      return res.status(200).json({
        success: true,
        leaderboard: {
          topRunScorers: [],
          topWicketTakers: [],
          highestScores: [],
          mostSixes: [],
          mostFours: [],
          bestEconomy: [],
          bestBattingAverage: [],
        },
      });
    }

    const inningsList = await Innings.find({
      $or: [{ match: { $in: matchIds } }, { matchId: { $in: matchIds } }],
    });

    const batsmenMap = new Map();
    const bowlersMap = new Map();

    inningsList.forEach((inn) => {
      // Aggregate Batting
      const battingEntries =
        inn.batsmen && inn.batsmen.length > 0 ? inn.batsmen : inn.battingStats || [];

      battingEntries.forEach((b) => {
        const key = (b.name || '').trim();
        if (!key) return;

        if (!batsmenMap.has(key)) {
          batsmenMap.set(key, {
            name: b.name,
            playerName: b.name,
            playerId: b.playerId,
            team: inn.battingTeam || inn.team || '',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dismissals: 0,
            highScore: 0,
            inningsCount: 0,
          });
        }
        const bStats = batsmenMap.get(key);
        bStats.runs += b.runs || 0;
        bStats.balls += b.balls || 0;
        bStats.fours += b.fours || 0;
        bStats.sixes += b.sixes || 0;
        bStats.inningsCount += 1;
        if (b.runs > bStats.highScore) {
          bStats.highScore = b.runs;
        }
        if (b.isOut) {
          bStats.dismissals += 1;
        }
      });

      // Aggregate Bowling
      const bowlingEntries =
        inn.bowlers && inn.bowlers.length > 0 ? inn.bowlers : inn.bowlingStats || [];

      bowlingEntries.forEach((bw) => {
        const key = (bw.name || '').trim();
        if (!key) return;

        if (!bowlersMap.has(key)) {
          bowlersMap.set(key, {
            name: bw.name,
            playerName: bw.name,
            playerId: bw.playerId,
            team: inn.bowlingTeam || '',
            runsConceded: 0,
            wickets: 0,
            maidens: 0,
            legalBalls: 0,
          });
        }
        const bwStats = bowlersMap.get(key);
        bwStats.runsConceded += bw.runsConceded || 0;
        bwStats.wickets += bw.wickets || 0;
        bwStats.maidens += bw.maidens || 0;

        if (bw.legalBalls) {
          bwStats.legalBalls += bw.legalBalls;
        } else {
          const oversParts = String(bw.overs || '0.0').split('.');
          const overs = parseInt(oversParts[0], 10) || 0;
          const balls = parseInt(oversParts[1], 10) || 0;
          bwStats.legalBalls += overs * 6 + balls;
        }
      });
    });

    // 1. Top Run Scorers
    const topRunScorers = Array.from(batsmenMap.values())
      .map((b) => ({
        ...b,
        strikeRate: b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0,
        average: b.dismissals > 0 ? parseFloat((b.runs / b.dismissals).toFixed(1)) : b.runs,
      }))
      .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
      .slice(0, 10);

    // 2. Top Wicket Takers
    const topWicketTakers = Array.from(bowlersMap.values())
      .map((bw) => {
        const oversDec = bw.legalBalls / 6;
        const economy = oversDec > 0 ? parseFloat((bw.runsConceded / oversDec).toFixed(2)) : 0;
        const oversStr = `${Math.floor(bw.legalBalls / 6)}.${bw.legalBalls % 6}`;
        return {
          ...bw,
          overs: oversStr,
          economy,
        };
      })
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
      .slice(0, 10);

    // 3. Highest Individual Scores
    const highestScores = Array.from(batsmenMap.values())
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 10)
      .map((b) => ({ name: b.name, highScore: b.highScore, team: b.team }));

    // 4. Most Sixes
    const mostSixes = Array.from(batsmenMap.values())
      .filter((b) => b.sixes > 0)
      .sort((a, b) => b.sixes - a.sixes)
      .slice(0, 10);

    // 5. Most Fours
    const mostFours = Array.from(batsmenMap.values())
      .filter((b) => b.fours > 0)
      .sort((a, b) => b.fours - a.fours)
      .slice(0, 10);

    // 6. Best Economy (minimum 12 legal balls / 2 overs)
    const bestEconomy = Array.from(bowlersMap.values())
      .filter((bw) => bw.legalBalls >= 12)
      .map((bw) => {
        const oversDec = bw.legalBalls / 6;
        const economy = parseFloat((bw.runsConceded / oversDec).toFixed(2));
        return { ...bw, economy, overs: `${Math.floor(bw.legalBalls / 6)}.${bw.legalBalls % 6}` };
      })
      .sort((a, b) => a.economy - b.economy)
      .slice(0, 10);

    // 7. Best Batting Average (minimum 20 runs)
    const bestBattingAverage = Array.from(batsmenMap.values())
      .filter((b) => b.runs >= 20)
      .map((b) => ({
        ...b,
        average: b.dismissals > 0 ? parseFloat((b.runs / b.dismissals).toFixed(1)) : b.runs,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      topBatsmen: topRunScorers,
      topBowlers: topWicketTakers,
      leaderboard: {
        topRunScorers,
        topBatsmen: topRunScorers,
        topWicketTakers,
        topBowlers: topWicketTakers,
        highestScores,
        mostSixes,
        mostFours,
        bestEconomy,
        bestBattingAverage,
      },
    });
  } catch (error) {
    next(error);
  }
};
