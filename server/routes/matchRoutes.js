import { Router } from 'express';
import {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
} from '../controllers/matchController.js';
import {
  getMatchSquad,
  setPlayingXI,
  setBowler,
  setStriker,
  setNonStriker,
  recordDelivery,
  getMatchScoringState,
} from '../controllers/scoringController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Public routes: List matches and view match detail
router.get('/', getMatches);
router.get('/:id', getMatchById);

// Real-world scorecard & match squad routes
router.get('/:id/squad', getMatchSquad);
router.get('/:id/scorecard', getMatchScoringState);

// Protected routes: Create, update, and delete matches
router.post('/', authMiddleware, createMatch);
router.put('/:id', authMiddleware, updateMatch);
router.delete('/:id', authMiddleware, deleteMatch);

// Protected scoring & XI routes
router.post('/:id/playing-xi', authMiddleware, setPlayingXI);
router.put('/:id/bowler', authMiddleware, setBowler);
router.put('/:id/striker', authMiddleware, setStriker);
router.put('/:id/non-striker', authMiddleware, setNonStriker);
router.post('/:id/deliveries', authMiddleware, recordDelivery);

export default router;

