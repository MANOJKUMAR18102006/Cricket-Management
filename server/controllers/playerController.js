import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Player from '../models/Player.js';
import User from '../models/User.js';
import { canViewPlayerData, getPlayerForUser } from '../services/privacyService.js';

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

    const total = await Player.countDocuments(query);

    const players = await Player.find(query)
      .populate('userId', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format safe public player cards (protecting private statistics)
    const formattedPlayers = players.map((player) => ({
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
      user: player.userId
        ? {
            username: player.userId.username,
            role: player.userId.role,
          }
        : null,
    }));

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

    // Attempt to identify viewer from JWT if provided in header
    let viewerPlayer = null;
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

    // Evaluate backend privacy authorization
    const canViewDetails = await canViewPlayerData(viewerPlayer?._id, player._id);
    const isOwner = viewerPlayer && String(viewerPlayer._id) === String(player._id);

    // If account is PRIVATE and viewer is NOT authorized:
    // Return basic identity only, strictly omitting protected data
    if (!canViewDetails) {
      return res.status(200).json({
        success: true,
        canViewDetails: false,
        isOwner: false,
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
          user: player.userId
            ? {
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
        user: player.userId
          ? {
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
