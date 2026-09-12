import { Router } from 'express';
import {
  createTournament,
  getTournaments,
  getMyTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  sendTournamentInvitation,
  getTournamentInvitations,
  createTournamentFixture,
  getTournamentMatches,
  getTournamentPointsTable,
  getTournamentLeaderboard,
} from '../controllers/tournamentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// 1. Specific / Non-parameterized routes (MUST precede /:id)
router.get('/my', authMiddleware, getMyTournaments);

// 2. Base collection routes
router.get('/', getTournaments);
router.post('/', authMiddleware, createTournament);

// 3. Tournament Fixtures, Standings, & Leaderboards
router.post('/:id/matches', authMiddleware, createTournamentFixture);
router.get('/:id/matches', getTournamentMatches);
router.get('/:id/points-table', getTournamentPointsTable);
router.get('/:id/leaderboard', getTournamentLeaderboard);

// 4. Team Invitations within tournament
router.post('/:tournamentId/invitations', authMiddleware, sendTournamentInvitation);
router.get('/:tournamentId/invitations', authMiddleware, getTournamentInvitations);

// 5. Individual tournament details and management
router.get('/:id', getTournamentById);
router.put('/:id', authMiddleware, updateTournament);
router.delete('/:id', authMiddleware, deleteTournament);

export default router;
