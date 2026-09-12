import { Router } from 'express';
import {
  getReceivedInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
} from '../controllers/teamInvitationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// All invitation endpoints require authentication
router.use(authMiddleware);

// Get pending invitations received by current player
router.get('/received', getReceivedInvitations);

// Accept or reject invitations
router.put('/:id/accept', acceptInvitation);
router.put('/:id/reject', rejectInvitation);

// Cancel a pending invitation (by captain/inviter)
router.delete('/:id', cancelInvitation);

export default router;
