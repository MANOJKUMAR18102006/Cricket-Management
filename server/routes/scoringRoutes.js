import { Router } from 'express';
import {
  getMatchScoringState,
  getMatchSquad,
  setPlayingXI,
  setBowler,
  setStriker,
  setNonStriker,
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

// Public: View live scoring state & squads
router.get('/:matchId', getMatchScoringState);
router.get('/:matchId/squad', getMatchSquad);
router.get('/:matchId/scorecard', getMatchScoringState);

// Protected: Playing XI and roles
router.post('/:matchId/playing-xi', authMiddleware, setPlayingXI);
router.put('/:matchId/bowler', authMiddleware, setBowler);
router.put('/:matchId/striker', authMiddleware, setStriker);
router.put('/:matchId/non-striker', authMiddleware, setNonStriker);

// Protected: Scorer & Admin controls
router.post('/:matchId/start-innings', authMiddleware, startInnings);
router.post('/:matchId/delivery', authMiddleware, recordDelivery);
router.post('/:matchId/deliveries', authMiddleware, recordDelivery);
router.post('/:matchId/undo', authMiddleware, undoDelivery);
router.post('/:matchId/change-striker', authMiddleware, changeStriker);
router.post('/:matchId/end-over', authMiddleware, endOver);
router.post('/:matchId/end-innings', authMiddleware, endInnings);
router.post('/:matchId/complete-match', authMiddleware, completeMatch);

export default router;

