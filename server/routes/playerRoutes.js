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
} from '../controllers/playerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkConnectionMiddleware } from '../middlewares/checkConnectionMiddleware.js';

const router = Router();

// Current user player profile (Protected)
router.post('/', authMiddleware, createPlayer);
router.get('/me', authMiddleware, getMyPlayerProfile);
router.put('/me', authMiddleware, updateMyPlayerProfile);
router.put('/me/privacy', authMiddleware, updatePrivacySetting);

// Public player discovery search (Accessible to all users)
router.get('/', searchPlayers);

// Public player profile (Accessible to all users, with backend privacy filtering)
router.get('/:id', getPlayerById);

// Automatic Player Career Statistics (Generated dynamically from match performance, with privacy guard)
router.get('/:id/stats', getPlayerCareerStats);

// Protected player cricket statistics (Guarded strictly by checkConnectionMiddleware)
router.get('/:id/protected-stats', authMiddleware, checkConnectionMiddleware, getProtectedPlayerStats);

export default router;
