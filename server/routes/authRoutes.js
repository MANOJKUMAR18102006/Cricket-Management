import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// POST /api/auth/register - Register a new account
router.post('/register', register);

// POST /api/auth/login - Log into existing account
router.post('/login', login);

// GET /api/auth/me - Retrieve current logged-in user profile
router.get('/me', authMiddleware, getMe);

export default router;
