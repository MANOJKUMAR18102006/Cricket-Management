import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Get Admin Dashboard Overview Statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin Only)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalPlayers,
      totalTeams,
      totalMatches,
      completedMatches,
      liveMatches,
      distinctTournaments,
      recentUsers,
      recentMatches,
    ] = await Promise.all([
      User.countDocuments(),
      Player.countDocuments(),
      Team.countDocuments(),
      Match.countDocuments(),
      Match.countDocuments({ status: 'completed' }),
      Match.countDocuments({ status: 'live' }),
      Match.distinct('tournament', { tournament: { $nin: ['', null] } }),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
      Match.find().sort({ date: -1 }).limit(5).select('team1 team2 format status date venue tournament winner result'),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPlayers,
        totalTeams,
        totalMatches,
        completedMatches,
        liveMatches,
        totalTournaments: distinctTournaments.length,
      },
      tournamentsList: distinctTournaments,
      recentUsers,
      recentMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users with search, role, and status filters
 * @route   GET /api/admin/users
 * @access  Private (Admin Only)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { search = '', role = 'all', status = 'all', page = 1, limit = 20 } = req.query;

    const query = {};

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
      ];
    }

    if (role !== 'all') {
      query.role = role;
    }

    if (status !== 'all') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-password'),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user account status (active / disabled)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin Only)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be either active or disabled.',
      });
    }

    // Guard: Prevent admin from disabling their own account
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot disable your own administrator account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User account successfully ${status === 'active' ? 'enabled' : 'disabled'}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role (admin / player)
 * @route   PUT /api/admin/users/:id/role
 * @access  Private (Admin Only)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'player'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role value. Must be either admin or player.',
      });
    }

    // Guard: Prevent admin from removing their own admin privilege
    if (req.user._id.toString() === id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot revoke your own administrator privileges.',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account and cascade clean player profile
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin Only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own administrator account.',
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Clean associated player profile, connections, and notifications
    await Promise.all([
      Player.findOneAndDelete({ user: id }),
      Connection.deleteMany({ $or: [{ requester: id }, { recipient: id }] }),
      Notification.deleteMany({ $or: [{ recipient: id }, { sender: id }] }),
    ]);

    res.status(200).json({
      success: true,
      message: 'User account and associated records deleted permanently.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all players with search & filters
 * @route   GET /api/admin/players
 * @access  Private (Admin Only)
 */
export const getPlayers = async (req, res, next) => {
  try {
    const { search = '', role = 'all', page = 1, limit = 20 } = req.query;

    const query = {};
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { displayName: searchRegex },
        { username: searchRegex },
        { currentTeam: searchRegex },
        { city: searchRegex },
      ];
    }

    if (role !== 'all') {
      query.playingRole = role;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [players, total] = await Promise.all([
      Player.find(query)
        .populate('user', 'username email status role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Player.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      players,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete player profile (moderation / inappropriate content removal)
 * @route   DELETE /api/admin/players/:id
 * @access  Private (Admin Only)
 */
export const deletePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const player = await Player.findByIdAndDelete(id);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player profile not found.',
      });
    }

    // Clean connections for this player's user
    if (player.user) {
      await Connection.deleteMany({
        $or: [{ requester: player.user }, { recipient: player.user }],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Player profile removed by administrator.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teams with search & filters
 * @route   GET /api/admin/teams
 * @access  Private (Admin Only)
 */
export const getTeams = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;

    const query = {};
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { city: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [teams, total] = await Promise.all([
      Team.find(query)
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Team.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      teams,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a team (moderation / remove inappropriate content)
 * @route   DELETE /api/admin/teams/:id
 * @access  Private (Admin Only)
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findByIdAndDelete(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Team removed successfully by administrator.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all matches with search & status filters
 * @route   GET /api/admin/matches
 * @access  Private (Admin Only)
 */
export const getMatches = async (req, res, next) => {
  try {
    const { search = '', status = 'all', format = 'all', page = 1, limit = 20 } = req.query;

    const query = {};
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { team1: searchRegex },
        { team2: searchRegex },
        { venue: searchRegex },
        { city: searchRegex },
        { tournament: searchRegex },
      ];
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (format !== 'all') {
      query.format = format;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [matches, total] = await Promise.all([
      Match.find(query)
        .populate('createdBy', 'username email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Match.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      matches,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update match status
 * @route   PUT /api/admin/matches/:id/status
 * @access  Private (Admin Only)
 */
export const updateMatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'live', 'completed', 'abandoned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const match = await Match.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Match status updated to ${status}.`,
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a match fixture (moderation / remove inappropriate record)
 * @route   DELETE /api/admin/matches/:id
 * @access  Private (Admin Only)
 */
export const deleteMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await Match.findByIdAndDelete(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match fixture removed successfully by administrator.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregated list of tournaments across matches
 * @route   GET /api/admin/tournaments
 * @access  Private (Admin Only)
 */
export const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Match.aggregate([
      { $match: { tournament: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$tournament',
          name: { $first: '$tournament' },
          totalMatches: { $sum: 1 },
          completedMatches: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          liveMatches: {
            $sum: { $cond: [{ $eq: ['$status', 'live'] }, 1, 0] },
          },
          formats: { $addToSet: '$format' },
          latestMatchDate: { $max: '$date' },
        },
      },
      { $sort: { totalMatches: -1 } },
    ]);

    res.status(200).json({
      success: true,
      tournaments,
      total: tournaments.length,
    });
  } catch (error) {
    next(error);
  }
};
