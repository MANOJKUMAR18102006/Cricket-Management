import { Router } from 'express';
import {
  sendConnectionRequest,
  getReceivedRequests,
  getSentRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getAcceptedConnections,
  getPlayerConnectionStatus,
} from '../controllers/connectionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// All connection routes require authentication
router.use(authMiddleware);

// Send connection request
router.post('/request/:playerId', sendConnectionRequest);

// Received pending requests
router.get('/requests', getReceivedRequests);

// Sent pending requests
router.get('/sent', getSentRequests);

// Accept connection request
router.put('/:id/accept', acceptConnectionRequest);

// Reject connection request
router.put('/:id/reject', rejectConnectionRequest);

// Remove connection
router.delete('/:id', removeConnection);

// List accepted connections
router.get('/', getAcceptedConnections);

// Get connection relationship status with a player
router.get('/status/:playerId', getPlayerConnectionStatus);

export default router;
