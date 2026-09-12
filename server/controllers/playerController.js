import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Player from '../models/Player.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Team from '../models/Team.js';
import Connection from '../models/Connection.js';
import { canViewPlayerData, getPlayerForUser, checkConnection, getConnectionStatus } from '../services/privacyService.js';
import { calculatePlayerStats } from '../services/playerStatsService.js';

/**
 * @route   GET /api/players
 * @desc    Search and discover players with filters & pagination
 * @access  Public
 */
export const searchPlayers = async (req, res, next) => {
  try {
    const { search, team, city, role } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Keyword search across name, username, team, and city
    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitizedSearch, 'i');

      // Find user IDs whose username matches
      const matchingUsers = await User.find({ username: searchRegex }).select('_id');
      const matchingUserIds = matchingUsers.map((u) => u._id);

      const orConditions = [
        { displayName: searchRegex },
        { currentTeam: searchRegex },
        { city: searchRegex },
      ];

      if (matchingUserIds.length > 0) {
        orConditions.push({ userId: { $in: matchingUserIds } });
      }

      query.$or = orConditions;
    }

    // 2. Filter by Team
    if (team && team.trim()) {
      const sanitizedTeam = team.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.currentTeam = new RegExp(sanitizedTeam, 'i');
    }

    // 3. Filter by City
    if (city && city.trim()) {
      const sanitizedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.city = new RegExp(sanitizedCity, 'i');
    }

    // 4. Filter by Playing Role (Batter, Bowler, All-Rounder, Wicketkeeper)
    if (role && role.trim() && role.toLowerCase() !== 'all') {
      const sanitizedRole = role.trim();
      query.playingRole = new RegExp(`^${sanitizedRole}$`, 'i');
    }

    // 5. Exclude the authenticated viewer from discovery search (they only discover other cricketers)
    let viewerPlayer = null;
    if (req.user) {
      viewerPlayer = await Player.findOne({ userId: req.user._id });
      if (viewerPlayer) {
        query._id = { $ne: viewerPlayer._id };
      } else {
        query.userId = { $ne: req.user._id };
      }
    }

    const total = await Player.countDocuments(query);

    const players = await Player.find(query)
      .populate('userId', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compute connection status for discovered players
    const connectionsMap = new Map();
    if (viewerPlayer && players.length > 0) {
      const playerIds = players.map((p) => p._id);
      const connections = await Connection.find({
        $or: [
          { requester: viewerPlayer._id, receiver: { $in: playerIds } },
          { requester: { $in: playerIds }, receiver: viewerPlayer._id },
        ],
      });

      connections.forEach((conn) => {
        const isRequester = String(conn.requester) === String(viewerPlayer._id);
        const otherPlayerId = isRequester ? String(conn.receiver) : String(conn.requester);

        let status = conn.status;
        if (conn.status === 'accepted') {
          status = 'connected';
        } else if (conn.status === 'pending') {
          status = isRequester ? 'pending_sent' : 'pending_received';
        }

        connectionsMap.set(otherPlayerId, {
          status,
          connectionId: conn._id,
        });
      });
    }

    // Format safe public player cards (protecting private statistics)
    const formattedPlayers = players.map((player) => {
      const isSelf = viewerPlayer && String(player._id) === String(viewerPlayer._id);
      const connInfo = connectionsMap.get(String(player._id));
      const connectionStatus = isSelf ? 'self' : (connInfo?.status || 'none');

      return {
        _id: player._id,
        displayName: player.displayName,
        username: player.userId?.username || 'player',
        profileImage: player.profileImage || '',
        playingRole: player.playingRole,
        currentTeam: player.currentTeam || 'Free Agent',
        city: player.city || 'Unspecified',
        battingStyle: player.battingStyle || 'Right-hand bat',
        bowlingStyle: player.bowlingStyle || 'None',
        jerseyNumber: player.jerseyNumber,
        bio: player.bio || '',
        createdAt: player.createdAt,
        connectionStatus,
        connectionId: connInfo?.connectionId || null,
        user: player.userId
          ? {
              username: player.userId.username,
              role: player.userId.role,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedPlayers.length,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      limit,
      players: formattedPlayers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/players
 * @desc    Create player profile for current user
 * @access  Private
 */
export const createPlayer = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check if player profile already exists
    const existingPlayer = await Player.findOne({ userId });
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Player profile already exists. Use PUT /api/players/me to update.',
        player: existingPlayer,
      });
    }

    const {
      displayName,
      profileImage,
      dateOfBirth,
      gender,
      city,
      playingRole,
      battingStyle,
      bowlingStyle,
      jerseyNumber,
      bio,
      currentTeam,
    } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Display name is required.',
      });
    }

    if (!playingRole) {
      return res.status(400).json({
        success: false,
        message: 'Playing role is required (Batter, Bowler, All-Rounder, Wicketkeeper).',
      });
    }

    const player = await Player.create({
      userId,
      displayName: displayName.trim(),
      profileImage: profileImage || req.user.profileImage || '',
      dateOfBirth: dateOfBirth || null,
      gender: gender || 'Male',
      city: city || req.user.city || '',
      playingRole,
      battingStyle: battingStyle || 'Right-hand bat',
      bowlingStyle: bowlingStyle || 'None',
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
      bio: bio || req.user.bio || '',
      currentTeam: currentTeam || '',
    });

    res.status(201).json({
      success: true,
      message: 'Player profile created successfully!',
      player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/me
 * @desc    Get current user's player profile
 * @access  Private
 */
export const getMyPlayerProfile = async (req, res, next) => {
  try {
    const player = await Player.findOne({ userId: req.user._id }).populate(
      'userId',
      'username email role createdAt'
    );

    if (!player) {
      return res.status(200).json({
        success: true,
        player: null,
        hasProfile: false,
        message: 'No player profile found for this user.',
      });
    }

    res.status(200).json({
      success: true,
      hasProfile: true,
      player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/players/me
 * @desc    Update current user's player profile
 * @access  Private
 */
export const updateMyPlayerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const allowedUpdates = [
      'displayName',
      'profileImage',
      'dateOfBirth',
      'gender',
      'city',
      'playingRole',
      'battingStyle',
      'bowlingStyle',
      'jerseyNumber',
      'bio',
      'currentTeam',
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Find and update or create if doesn't exist yet
    let player = await Player.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    // If profile didn't exist yet, create it
    if (!player) {
      if (!updates.displayName) {
        updates.displayName = req.user.username;
      }
      if (!updates.playingRole) {
        updates.playingRole = 'Batter';
      }
      player = await Player.create({
        userId,
        ...updates,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Player profile updated successfully!',
      player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/players/me/privacy
 * @desc    Update privacy setting (public/private) for current authenticated player
 * @access  Private
 */
export const updatePrivacySetting = async (req, res, next) => {
  try {
    const { profileVisibility } = req.body;

    if (!profileVisibility || !['public', 'private'].includes(profileVisibility)) {
      return res.status(400).json({
        success: false,
        message: 'profileVisibility must be either "public" or "private".',
      });
    }

    const player = await getPlayerForUser(req.user);
    player.profileVisibility = profileVisibility;
    await player.save();

    res.status(200).json({
      success: true,
      message: `Account visibility updated to ${profileVisibility}.`,
      profileVisibility: player.profileVisibility,
      player: {
        _id: player._id,
        displayName: player.displayName,
        profileVisibility: player.profileVisibility,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/:id
 * @desc    Get player profile by Player ID or User ID with backend privacy enforcement
 * @access  Public (Optional auth for viewer identity)
 */
export const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player ID format.',
      });
    }

    // Query either by Player _id or by userId
    let player = await Player.findById(id).populate('userId', 'username role');

    if (!player) {
      player = await Player.findOne({ userId: id }).populate('userId', 'username role');
    }

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found.',
      });
    }

    // Attempt to identify viewer from req.user or JWT if provided in header
    let viewerPlayer = null;
    if (req.user) {
      viewerPlayer = await Player.findOne({ userId: req.user._id });
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026'
          );
          const user = await User.findById(decoded.id);
          if (user) {
            viewerPlayer = await Player.findOne({ userId: user._id });
          }
        } catch (err) {
          // Token invalid/expired - viewer remains unauthenticated (null)
        }
      }
    }

    // Evaluate backend ownership and privacy authorization
    const isOwner = Boolean(
      (req.user && String(player.userId?._id || player.userId) === String(req.user._id)) ||
      (viewerPlayer && String(viewerPlayer._id) === String(player._id))
    );
    const canViewDetails = isOwner ? true : await canViewPlayerData(viewerPlayer?._id, player._id);
    const connResult = viewerPlayer
      ? await getConnectionStatus(viewerPlayer._id, player._id)
      : { status: 'none' };
    const connectionStatus = isOwner ? 'self' : connResult.status;
    const connectionId = connResult.connectionId || null;

    // If account is PRIVATE and viewer is NOT authorized:
    // Return basic identity only, strictly omitting protected data
    if (!canViewDetails) {
      return res.status(200).json({
        success: true,
        canViewDetails: false,
        isOwner: false,
        isOwnProfile: false,
        connectionStatus,
        connectionId,
        privacyRestricted: true,
        privacyMessage:
          '🔒 This account is private. Connect with this player to view their cricket statistics.',
        player: {
          _id: player._id,
          displayName: player.displayName,
          profileImage: player.profileImage,
          playingRole: player.playingRole,
          currentTeam: player.currentTeam,
          city: player.city,
          bio: player.bio,
          profileVisibility: player.profileVisibility,
          createdAt: player.createdAt,
          connectionStatus,
          connectionId,
          isOwner: false,
          isOwnProfile: false,
          user: player.userId
            ? {
                _id: player.userId._id,
                username: player.userId.username,
                role: player.userId.role,
              }
            : null,
        },
      });
    }

    // Authorized (Owner, Public Account, or Connected): Return full cricket profile
    res.status(200).json({
      success: true,
      canViewDetails: true,
      isOwner,
      isOwnProfile: isOwner,
      connectionStatus,
      connectionId,
      privacyRestricted: false,
      player: {
        _id: player._id,
        displayName: player.displayName,
        profileImage: player.profileImage,
        playingRole: player.playingRole,
        currentTeam: player.currentTeam,
        city: player.city,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        jerseyNumber: player.jerseyNumber,
        bio: player.bio,
        profileVisibility: player.profileVisibility,
        createdAt: player.createdAt,
        connectionStatus,
        connectionId,
        isOwner,
        isOwnProfile: isOwner,
        user: player.userId
          ? {
              _id: player.userId._id,
              username: player.userId.username,
              role: player.userId.role,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/:id/protected-stats
 * @desc    Protected cricket statistics endpoint (Guarded strictly by checkConnectionMiddleware)
 * @access  Private (Owner, Public, or Connected)
 */
export const getProtectedPlayerStats = async (req, res, next) => {
  try {
    const targetPlayer = req.targetPlayer;
    res.status(200).json({
      success: true,
      message: 'Cricket statistics retrieved successfully.',
      player: {
        _id: targetPlayer._id,
        displayName: targetPlayer.displayName,
        profileVisibility: targetPlayer.profileVisibility,
      },
      statistics: {
        matches: 48,
        runs: 1840,
        highestScore: 112,
        battingAverage: 46.0,
        strikeRate: 138.5,
        wickets: 24,
        bowlingAverage: 22.4,
        economyRate: 7.2,
        catches: 18,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/:id/stats
 * @desc    Get automatic player career statistics generated from match data (with optional ?format= filter)
 * @access  Public / Authenticated (Enforces privacy rules)
 */
export const getPlayerCareerStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'all' } = req.query;

    const targetPlayer = req.targetPlayer || (await Player.findById(id));
    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    // If requirePlayerConnection ran as middleware, authorization is already verified.
    // Otherwise fallback to checking authorization:
    if (!req.targetPlayer) {
      let viewerPlayerId = null;
      if (req.user) {
        const viewerPlayer = await Player.findOne({ userId: req.user._id });
        if (viewerPlayer) {
          viewerPlayerId = viewerPlayer._id;
        }
      } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026'
          );
          const user = await User.findById(decoded.id);
          if (user) {
            const viewerPlayer = await Player.findOne({ userId: user._id });
            if (viewerPlayer) {
              viewerPlayerId = viewerPlayer._id;
            }
          }
        } catch (err) {
          // Unauthenticated viewer
        }
      }

      const isAuthorized = await canViewPlayerData(viewerPlayerId, targetPlayer._id);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          privacyRestricted: true,
          message: "🔒 This player's cricket statistics are private. Connect with this player to view their statistics.",
        });
      }
    }

    // Calculate dynamic career statistics
    const stats = await calculatePlayerStats(targetPlayer._id, format);

    res.status(200).json({
      success: true,
      playerId: targetPlayer._id,
      displayName: targetPlayer.displayName,
      format,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/:id/matches
 * @desc    Get match history and player match-by-match performance
 * @access  Private (Guarded strictly by requirePlayerConnection)
 */
export const getPlayerMatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format, tournament, result, startDate, endDate } = req.query;

    const targetPlayer = req.targetPlayer || (await Player.findById(id));
    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    const playerIds = [String(targetPlayer._id)];
    const playerNames = [
      targetPlayer.displayName.trim().toLowerCase(),
      ...(targetPlayer.userId?.username ? [targetPlayer.userId.username.trim().toLowerCase()] : []),
    ];

    const matchesPlayer = (tId, tName) => {
      if (tId && playerIds.includes(String(tId))) return true;
      if (tName && playerNames.includes(tName.trim().toLowerCase())) return true;
      return false;
    };

    // Find teams where target player is a member
    const memberTeams = await Team.find({ members: targetPlayer._id }).sort({ createdAt: 1 });
    const playerTeamNames = memberTeams.map((t) => t.name.toLowerCase());
    if (targetPlayer.currentTeam && !playerTeamNames.includes(targetPlayer.currentTeam.toLowerCase())) {
      playerTeamNames.push(targetPlayer.currentTeam.toLowerCase());
    }

    // Find all completed and live matches
    const allMatches = await Match.find({
      status: { $in: ['completed', 'live'] },
    }).sort({ date: -1 });

    const matchIds = allMatches.map((m) => m._id);
    const allInnings = await Innings.find({ match: { $in: matchIds } });

    // Group innings by match ID
    const inningsByMatch = {};
    for (const inn of allInnings) {
      const mId = String(inn.match);
      if (!inningsByMatch[mId]) inningsByMatch[mId] = [];
      inningsByMatch[mId].push(inn);
    }

    const playerMatchHistory = [];
    const allTournamentsPlayed = new Set();
    const tournamentYearMap = new Map(); // tournamentName -> Set of years

    for (const match of allMatches) {
      const matchInnings = inningsByMatch[String(match._id)] || [];
      let playedInMatch = false;

      let battingPerformance = null;
      let bowlingPerformance = null;
      let fieldingCatches = 0;
      let fieldingRunOuts = 0;
      let fieldingStumpings = 0;
      let detectedPlayerTeam = '';

      // Scan through innings of this match
      for (const inn of matchInnings) {
        // Batting
        const batsmenList = inn.batsmen || inn.batsmanStats || [];
        const bat = batsmenList.find((b) => matchesPlayer(b.playerId, b.name));
        if (bat) {
          playedInMatch = true;
          detectedPlayerTeam = inn.battingTeam;
          battingPerformance = {
            runs: bat.runs,
            balls: bat.balls,
            fours: bat.fours,
            sixes: bat.sixes,
            strikeRate: bat.strikeRate,
            isOut: bat.isOut,
            dismissal: bat.dismissal,
          };
        }

        // Bowling
        const bowlersList = inn.bowlers || inn.bowlerStats || [];
        const bowl = bowlersList.find((b) => matchesPlayer(b.playerId, b.name));
        if (bowl) {
          playedInMatch = true;
          if (!detectedPlayerTeam) detectedPlayerTeam = inn.bowlingTeam;
          bowlingPerformance = {
            overs: bowl.overs,
            maidens: bowl.maidens,
            runsConceded: bowl.runsConceded,
            wickets: bowl.wickets,
            economy: bowl.economy,
          };
        }

        // Fielding
        for (const del of inn.deliveries || []) {
          if (del.isWicket && del.dismissal?.fielder) {
            if (playerNames.includes(del.dismissal.fielder.trim().toLowerCase())) {
              playedInMatch = true;
              if (del.wicketType === 'caught') fieldingCatches++;
              if (del.wicketType === 'run_out') fieldingRunOuts++;
              if (del.wicketType === 'stumped') fieldingStumpings++;
            }
          }
        }
      }

      // Check if match teams match the player's team roster
      if (!playedInMatch) {
        if (playerTeamNames.includes(match.team1.toLowerCase())) {
          playedInMatch = true;
          detectedPlayerTeam = match.team1;
        } else if (playerTeamNames.includes(match.team2.toLowerCase())) {
          playedInMatch = true;
          detectedPlayerTeam = match.team2;
        }
      }

      if (playedInMatch) {
        // Determine playerTeam and opponent
        let playerTeam = detectedPlayerTeam;
        let opponent = '';

        if (!playerTeam) {
          if (playerTeamNames.includes(match.team1.toLowerCase())) {
            playerTeam = match.team1;
            opponent = match.team2;
          } else if (playerTeamNames.includes(match.team2.toLowerCase())) {
            playerTeam = match.team2;
            opponent = match.team1;
          } else {
            playerTeam = match.team1;
            opponent = match.team2;
          }
        } else {
          opponent =
            playerTeam.toLowerCase() === match.team1.toLowerCase()
              ? match.team2
              : match.team1;
        }

        // Track tournament and year for timeline
        const matchYear = new Date(match.date).getFullYear();
        const tournamentName = match.tournament || 'Friendly Club Series';
        allTournamentsPlayed.add(tournamentName);
        if (!tournamentYearMap.has(tournamentName)) {
          tournamentYearMap.set(tournamentName, new Set());
        }
        tournamentYearMap.get(tournamentName).add(matchYear);

        // Compute match outcome relative to player's team
        let matchOutcome = 'in_progress';
        if (match.status === 'completed') {
          if (match.winner) {
            if (match.winner.toLowerCase() === playerTeam.toLowerCase()) {
              matchOutcome = 'won';
            } else if (match.winner.toLowerCase() === opponent.toLowerCase()) {
              matchOutcome = 'lost';
            } else {
              matchOutcome = 'other';
            }
          } else if (
            match.result &&
            (match.result.toLowerCase().includes('tie') || match.result.toLowerCase().includes('draw'))
          ) {
            matchOutcome = 'tie';
          } else {
            matchOutcome = 'completed';
          }
        }

        // Apply filters
        // 1. Format filter
        if (format && format !== 'all' && format !== 'Overall') {
          if (match.format.toLowerCase() !== format.toLowerCase()) {
            continue;
          }
        }

        // 2. Tournament filter
        if (tournament && tournament.trim() && tournament !== 'all') {
          const tFilter = tournament.trim().toLowerCase();
          const tName = (match.tournament || '').toLowerCase();
          if (!tName.includes(tFilter)) {
            continue;
          }
        }

        // 3. Date range filter
        if (startDate) {
          const sDate = new Date(startDate);
          if (new Date(match.date) < sDate) {
            continue;
          }
        }
        if (endDate) {
          const eDate = new Date(endDate);
          // Set to end of day
          eDate.setHours(23, 59, 59, 999);
          if (new Date(match.date) > eDate) {
            continue;
          }
        }

        // 4. Result filter (won, lost, tie/all)
        if (result && result !== 'all') {
          if (result.toLowerCase() === 'won' && matchOutcome !== 'won') {
            continue;
          }
          if (result.toLowerCase() === 'lost' && matchOutcome !== 'lost') {
            continue;
          }
          if (result.toLowerCase() === 'tie' && matchOutcome !== 'tie') {
            continue;
          }
        }

        // Extract flat metrics as requested
        const runs = battingPerformance ? battingPerformance.runs : 0;
        const balls = battingPerformance ? battingPerformance.balls : 0;
        const strikeRate = battingPerformance ? battingPerformance.strikeRate : '0.00';
        const wickets = bowlingPerformance ? bowlingPerformance.wickets : 0;
        const overs = bowlingPerformance ? bowlingPerformance.overs : '0.0';
        const catches = fieldingCatches;

        playerMatchHistory.push({
          matchId: match._id,
          opponent,
          playerTeam,
          team1: match.team1,
          team2: match.team2,
          format: match.format,
          oversLimit: match.overs,
          venue: match.venue,
          city: match.city,
          date: match.date,
          tournament: tournamentName,
          status: match.status,
          winner: match.winner,
          result: match.result,
          outcome: matchOutcome,
          // Flat metrics requested:
          runs,
          balls,
          strikeRate,
          wickets,
          overs,
          catches,
          // Full breakdown:
          performance: {
            batting: battingPerformance,
            bowling: bowlingPerformance,
            fielding: {
              catches: fieldingCatches,
              runOuts: fieldingRunOuts,
              stumpings: fieldingStumpings,
            },
          },
        });
      }
    }

    // =========================================================================
    // BUILD CAREER TIMELINE
    // =========================================================================
    const timeline = [];
    const seenTimelineKeys = new Set();

    const addTimelineEvent = (year, title, type, details = '') => {
      const key = `${year}_${title.toLowerCase()}`;
      if (!seenTimelineKeys.has(key)) {
        seenTimelineKeys.add(key);
        timeline.push({
          year,
          title,
          type, // 'career_start' | 'team' | 'tournament' | 'milestone'
          details,
        });
      }
    };

    // 1. Player debut / account creation
    const debutYear = new Date(targetPlayer.createdAt || Date.now()).getFullYear();
    addTimelineEvent(
      debutYear,
      'Joined CrickPulse',
      'career_start',
      `Registered playing role: ${targetPlayer.playingRole || 'Batter'}`
    );

    // 2. Teams joined
    for (const tm of memberTeams) {
      const teamYear = new Date(tm.createdAt || targetPlayer.createdAt).getFullYear();
      addTimelineEvent(
        teamYear,
        `Joined ${tm.name}`,
        'team',
        `Member of ${tm.name} based in ${tm.city}`
      );
    }

    if (
      targetPlayer.currentTeam &&
      !memberTeams.some((t) => t.name.toLowerCase() === targetPlayer.currentTeam.toLowerCase())
    ) {
      const currYear = new Date(targetPlayer.updatedAt || targetPlayer.createdAt).getFullYear();
      addTimelineEvent(
        currYear,
        `Joined ${targetPlayer.currentTeam}`,
        'team',
        `Current club affiliation in ${targetPlayer.city || 'local district'}`
      );
    }

    // 3. Tournaments played
    for (const [tName, yearsSet] of tournamentYearMap.entries()) {
      for (const tYear of yearsSet) {
        addTimelineEvent(
          tYear,
          `Played ${tName}`,
          'tournament',
          `Competed in ${tName} matches`
        );
      }
    }

    // Sort timeline chronologically (earliest to latest)
    timeline.sort((a, b) => a.year - b.year);

    res.status(200).json({
      success: true,
      count: playerMatchHistory.length,
      playerId: targetPlayer._id,
      displayName: targetPlayer.displayName,
      playingRole: targetPlayer.playingRole,
      currentTeam: targetPlayer.currentTeam,
      city: targetPlayer.city,
      matches: playerMatchHistory,
      timeline,
      availableTournaments: Array.from(allTournamentsPlayed),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/players/compare
 * @desc    Compare cricket statistics between two connected players
 * @access  Private (Requires accepted connection between playerA and playerB)
 */
export const comparePlayers = async (req, res, next) => {
  try {
    const { playerA: playerAIdParam, playerB: playerBIdParam, format = 'all' } = req.query;
    const playerBId = playerBIdParam || req.query.player || req.query.player2;

    let callerPlayer = null;
    if (req.user) {
      callerPlayer = await getPlayerForUser(req.user);
    }

    // Default playerA to caller if not supplied
    const playerAId = playerAIdParam || callerPlayer?._id;

    if (!playerAId) {
      return res.status(400).json({
        success: false,
        message: 'Please sign in or provide playerA parameter for comparison.',
      });
    }

    if (!playerBId) {
      return res.status(400).json({
        success: false,
        message: 'Target player parameter is required for comparison.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(playerAId) || !mongoose.Types.ObjectId.isValid(playerBId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player ID format provided.',
      });
    }

    if (String(playerAId) === String(playerBId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot compare a player with themselves. Please select two distinct players.',
      });
    }

    const playerA = await Player.findById(playerAId);
    const playerB = await Player.findById(playerBId);

    if (!playerA || !playerB) {
      return res.status(404).json({
        success: false,
        message: 'One or both players could not be found.',
      });
    }

    // PRIVACY CHECK:
    // If target player is PUBLIC: Comparison is allowed.
    // If target player is PRIVATE: Comparison requires an ACCEPTED connection.
    const canViewB = await canViewPlayerData(callerPlayer?._id, playerB._id);
    if (!canViewB) {
      return res.status(403).json({
        success: false,
        message: "🔒 This player's statistics are private. Connect with this player to compare statistics.",
        privacyRestricted: true,
        connected: false,
      });
    }

    const canViewA = await canViewPlayerData(callerPlayer?._id, playerA._id);
    if (!canViewA) {
      return res.status(403).json({
        success: false,
        message: "🔒 This player's statistics are private. Connect with this player to compare statistics.",
        privacyRestricted: true,
        connected: false,
      });
    }

    // Calculate dynamic stats for both players for the requested format
    const statsA = await calculatePlayerStats(playerA._id, format);
    const statsB = await calculatePlayerStats(playerB._id, format);

    // Helper for highest score numeric value comparison
    const parseHighScore = (hs) => {
      if (!hs) return 0;
      const num = parseInt(String(hs).replace('*', ''), 10);
      return isNaN(num) ? 0 : num;
    };

    // Determine stronger metric objectively
    // For higher is better: matches, runs, battingAverage, strikeRate, highestScore, fifties, hundreds, wickets, catches
    // For lower is better: bowlingAverage, economy
    const compareMetric = (valA, valB, lowerIsBetter = false) => {
      const numA = parseFloat(valA) || 0;
      const numB = parseFloat(valB) || 0;

      if (numA === numB) return 'equal';
      if (lowerIsBetter) {
        if (numA === 0 && numB > 0) return 'playerB';
        if (numB === 0 && numA > 0) return 'playerA';
        return numA < numB ? 'playerA' : 'playerB';
      }
      return numA > numB ? 'playerA' : 'playerB';
    };

    const batA = statsA?.batting || {};
    const batB = statsB?.batting || {};
    const bowlA = statsA?.bowling || {};
    const bowlB = statsB?.bowling || {};
    const fldA = statsA?.fielding || {};
    const fldB = statsB?.fielding || {};

    const comparison = {
      format: format === 'all' ? 'Overall' : format,
      players: {
        playerA: {
          _id: playerA._id,
          displayName: playerA.displayName,
          playingRole: playerA.playingRole,
          currentTeam: playerA.currentTeam,
          profileImage: playerA.profileImage,
          city: playerA.city,
          battingStyle: playerA.battingStyle,
          bowlingStyle: playerA.bowlingStyle,
        },
        playerB: {
          _id: playerB._id,
          displayName: playerB.displayName,
          playingRole: playerB.playingRole,
          currentTeam: playerB.currentTeam,
          profileImage: playerB.profileImage,
          city: playerB.city,
          battingStyle: playerB.battingStyle,
          bowlingStyle: playerB.bowlingStyle,
        },
      },
      metrics: [
        {
          key: 'matches',
          label: 'Matches',
          category: 'General',
          playerA: batA.matches || 0,
          playerB: batB.matches || 0,
          stronger: compareMetric(batA.matches, batB.matches),
        },
        {
          key: 'runs',
          label: 'Runs',
          category: 'Batting',
          playerA: batA.runs || 0,
          playerB: batB.runs || 0,
          stronger: compareMetric(batA.runs, batB.runs),
        },
        {
          key: 'battingAverage',
          label: 'Batting Average',
          category: 'Batting',
          playerA: batA.battingAverage || '0.00',
          playerB: batB.battingAverage || '0.00',
          stronger: compareMetric(batA.battingAverage, batB.battingAverage),
        },
        {
          key: 'strikeRate',
          label: 'Strike Rate',
          category: 'Batting',
          playerA: batA.strikeRate || '0.00',
          playerB: batB.strikeRate || '0.00',
          stronger: compareMetric(batA.strikeRate, batB.strikeRate),
        },
        {
          key: 'highestScore',
          label: 'Highest Score',
          category: 'Batting',
          playerA: batA.highestScore || '0',
          playerB: batB.highestScore || '0',
          stronger: compareMetric(parseHighScore(batA.highestScore), parseHighScore(batB.highestScore)),
        },
        {
          key: 'fifties',
          label: '50s',
          category: 'Batting',
          playerA: batA.fifties || 0,
          playerB: batB.fifties || 0,
          stronger: compareMetric(batA.fifties, batB.fifties),
        },
        {
          key: 'hundreds',
          label: '100s',
          category: 'Batting',
          playerA: batA.hundreds || 0,
          playerB: batB.hundreds || 0,
          stronger: compareMetric(batA.hundreds, batB.hundreds),
        },
        {
          key: 'wickets',
          label: 'Wickets',
          category: 'Bowling',
          playerA: bowlA.wickets || 0,
          playerB: bowlB.wickets || 0,
          stronger: compareMetric(bowlA.wickets, bowlB.wickets),
        },
        {
          key: 'bowlingAverage',
          label: 'Bowling Average',
          category: 'Bowling',
          playerA: bowlA.bowlingAverage || '0.00',
          playerB: bowlB.bowlingAverage || '0.00',
          stronger: compareMetric(bowlA.bowlingAverage, bowlB.bowlingAverage, true),
        },
        {
          key: 'economy',
          label: 'Economy',
          category: 'Bowling',
          playerA: bowlA.economy || '0.00',
          playerB: bowlB.economy || '0.00',
          stronger: compareMetric(bowlA.economy, bowlB.economy, true),
        },
        {
          key: 'catches',
          label: 'Catches',
          category: 'Fielding',
          playerA: fldA.catches || 0,
          playerB: fldB.catches || 0,
          stronger: compareMetric(fldA.catches, fldB.catches),
        },
      ],
      rawStats: {
        playerA: statsA,
        playerB: statsB,
      },
    };

    res.status(200).json({
      success: true,
      comparison,
    });
  } catch (error) {
    next(error);
  }
};



