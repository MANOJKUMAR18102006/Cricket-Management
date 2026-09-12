import express from 'express';
import {
  getLeaderboardsData,
  getPlayerAnalyticsData,
} from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * @route   GET /api/analytics/leaderboards
 * @desc    Get cricket leaderboards across 8 categories with privacy checks & filters
 * @access  Public / Optional Auth
 */
router.get('/leaderboards', getLeaderboardsData);

/**
 * @route   GET /api/analytics/players/:id
 * @desc    Get detailed player performance analytics and trends over time
 * @access  Privacy-guarded
 */
router.get('/players/:id', getPlayerAnalyticsData);

export default router;
