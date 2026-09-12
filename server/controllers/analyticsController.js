import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getPlayerForUser } from '../services/privacyService.js';
import { getLeaderboards, getPlayerAnalytics } from '../services/analyticsService.js';

/**
 * Helper to optionally resolve the viewing player from an Authorization header
 */
const resolveOptionalViewerPlayer = async (req) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return null;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return null;

    const player = await getPlayerForUser(user);
    return player ? player._id : null;
  } catch (err) {
    return null;
  }
};

/**
 * @route   GET /api/analytics/leaderboards
 * @desc    Get cricket leaderboards across 8 categories with privacy checks & filters
 * @access  Public (authenticating includes connected private players)
 */
export const getLeaderboardsData = async (req, res, next) => {
  try {
    const viewerPlayerId = req.user
      ? (await getPlayerForUser(req.user))?._id
      : await resolveOptionalViewerPlayer(req);

    const leaderboards = await getLeaderboards(viewerPlayerId, req.query);

    res.status(200).json({
      success: true,
      data: leaderboards,
      filters: {
        tournament: req.query.tournament || '',
        team: req.query.team || '',
        format: req.query.format || 'all',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || '',
        limit: req.query.limit || 10,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/players/:id
 * @desc    Get detailed player performance analytics and trends over time
 * @access  Private / Privacy-Guarded
 */
export const getPlayerAnalyticsData = async (req, res, next) => {
  try {
    const targetPlayerId = req.params.id;

    const viewerPlayerId = req.user
      ? (await getPlayerForUser(req.user))?._id
      : await resolveOptionalViewerPlayer(req);

    const analytics = await getPlayerAnalytics(targetPlayerId, viewerPlayerId, req.query);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    if (error.status === 403 || error.privacyRestricted) {
      return res.status(403).json({
        success: false,
        message: error.message,
        privacyRestricted: true,
      });
    }
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export default {
  getLeaderboardsData,
  getPlayerAnalyticsData,
};
