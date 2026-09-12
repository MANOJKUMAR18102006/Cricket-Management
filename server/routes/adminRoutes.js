import express from 'express';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getPlayers,
  deletePlayer,
  getTeams,
  deleteTeam,
  getMatches,
  updateMatchStatus,
  deleteMatch,
  getTournaments,
} from '../controllers/adminController.js';

const router = express.Router();

// Apply requireAdmin middleware to ALL admin routes
router.use(requireAdmin);

// Dashboard Overview
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Player Moderation
router.get('/players', getPlayers);
router.delete('/players/:id', deletePlayer);

// Team Moderation
router.get('/teams', getTeams);
router.delete('/teams/:id', deleteTeam);

// Match Moderation
router.get('/matches', getMatches);
router.put('/matches/:id/status', updateMatchStatus);
router.delete('/matches/:id', deleteMatch);

// Tournament Management
router.get('/tournaments', getTournaments);

export default router;
