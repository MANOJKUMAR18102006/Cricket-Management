import { Router } from 'express';
import {
  createPlayer,
  getMyPlayerProfile,
  updateMyPlayerProfile,
  updatePrivacySetting,
  getPlayerById,
  searchPlayers,
  getProtectedPlayerStats,
  getPlayerCareerStats,
  getPlayerMatches,
  comparePlayers,
} from '../controllers/playerController.js';
import { getPlayerAnalyticsData } from '../controllers/analyticsController.js';
import { authMiddleware, optionalAuth } from '../middlewares/authMiddleware.js';
import { checkConnectionMiddleware } from '../middlewares/checkConnectionMiddleware.js';
import { requirePlayerConnection } from '../middlewares/requirePlayerConnection.js';

const router = Router();

// Current user player profile (Protected)
router.post('/', authMiddleware, createPlayer);
router.get('/me', authMiddleware, getMyPlayerProfile);
router.put('/me', authMiddleware, updateMyPlayerProfile);
router.put('/me/privacy', authMiddleware, updatePrivacySetting);

// Public player discovery search (Supports optional authentication to detect connection status)
router.get('/', optionalAuth, searchPlayers);

// Player Comparison (Public for public players; enforces connection for private players)
router.get('/compare', optionalAuth, comparePlayers);

// Public player profile (Supports optional authentication to detect connection status)
router.get('/:id', optionalAuth, getPlayerById);

// Automatic Player Career Statistics (Guarded by requirePlayerConnection with public support)
router.get('/:id/stats', optionalAuth, requirePlayerConnection, getPlayerCareerStats);

// Player Match History & Match Performances (Guarded by requirePlayerConnection with public support)
router.get('/:id/matches', optionalAuth, requirePlayerConnection, getPlayerMatches);

// Protected player cricket statistics (Guarded by checkConnectionMiddleware)
router.get('/:id/protected-stats', optionalAuth, checkConnectionMiddleware, getProtectedPlayerStats);

// Player Performance Analytics & Trends (Privacy-guarded)
router.get('/:id/analytics', getPlayerAnalyticsData);

export default router;
