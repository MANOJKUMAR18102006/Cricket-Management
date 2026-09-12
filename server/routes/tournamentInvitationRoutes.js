import { Router } from 'express';
import {
  getReceivedTournamentInvitations,
  acceptTournamentInvitation,
  rejectTournamentInvitation,
  cancelTournamentInvitation,
} from '../controllers/tournamentInvitationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// All tournament invitation endpoints require authentication
router.use(authMiddleware);

// Get pending invitations received for the user's captained teams
router.get('/received', getReceivedTournamentInvitations);

// Captain accept / reject endpoints
router.put('/:id/accept', acceptTournamentInvitation);
router.put('/:id/reject', rejectTournamentInvitation);

// Organizer cancel invitation endpoint
router.delete('/:id', cancelTournamentInvitation);

export default router;
