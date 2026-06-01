import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', leaderboardController.getLeaderboard);
router.get('/my-rank', auth, leaderboardController.getMyRank);

export default router;
