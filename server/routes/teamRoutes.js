import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
} from '../controllers/teamController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

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
