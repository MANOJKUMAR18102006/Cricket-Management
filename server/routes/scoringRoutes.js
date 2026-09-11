import { Router } from 'express';
import {
  getMatchScoringState,
  startInnings,
  recordDelivery,
  undoDelivery,
  changeStriker,
  endOver,
  endInnings,
  completeMatch,
} from '../controllers/scoringController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Public: View live scoring state
router.get('/:matchId', getMatchScoringState);

// Protected: Scorer & Admin controls
router.post('/:matchId/start-innings', authMiddleware, startInnings);
router.post('/:matchId/delivery', authMiddleware, recordDelivery);
router.post('/:matchId/undo', authMiddleware, undoDelivery);
router.post('/:matchId/change-striker', authMiddleware, changeStriker);
router.post('/:matchId/end-over', authMiddleware, endOver);
router.post('/:matchId/end-innings', authMiddleware, endInnings);
router.post('/:matchId/complete-match', authMiddleware, completeMatch);

export default router;
