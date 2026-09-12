import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// GET /api/notifications - Get all notifications for authenticated player
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/read-all - Mark all notifications as read (MUST precede /:id/read)
router.put('/read-all', markAllAsRead);
router.put('/mark-all-read', markAllAsRead); // backwards compatibility alias

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', markAsRead);

export default router;
