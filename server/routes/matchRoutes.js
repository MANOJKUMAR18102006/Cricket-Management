import { Router } from 'express';
import {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
} from '../controllers/matchController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Public routes: List matches and view match detail
router.get('/', getMatches);
router.get('/:id', getMatchById);

// Protected routes: Create, update, and delete matches
router.post('/', authMiddleware, createMatch);
router.put('/:id', authMiddleware, updateMatch);
router.delete('/:id', authMiddleware, deleteMatch);

export default router;
