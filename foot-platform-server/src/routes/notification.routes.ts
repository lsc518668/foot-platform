import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, notificationController.getNotifications);

export default router;
