import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getMyTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
} from '../controllers/teamController.js';
import {
  sendTeamInvitation,
  getTeamInvitations,
} from '../controllers/teamInvitationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Specific routes
router.get('/my', authMiddleware, getMyTeams);

// Team Recruitment & Invitation routes
router.post('/:teamId/invitations', authMiddleware, sendTeamInvitation);
router.get('/:teamId/invitations', authMiddleware, getTeamInvitations);

// Public routes: List teams and view team profile
router.get('/', getTeams);
router.get('/:id', getTeamById);

// Protected routes: Create, update, delete teams
router.post('/', authMiddleware, createTeam);
router.put('/:id', authMiddleware, updateTeam);
router.delete('/:id', authMiddleware, deleteTeam);

// Membership routes: Add and remove players
router.post('/:id/members/:playerId', authMiddleware, addMember);
router.delete('/:id/members/:playerId', authMiddleware, removeMember);

export default router;
