import { Router } from 'express';
import { z } from 'zod';
import * as betController from '../controllers/bet.controller';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const placeBetSchema = z.object({
  matchId: z.number().int().positive('请选择比赛'),
  betType: z.enum(['home_win', 'draw', 'away_win'], { message: '请选择投注类型' }),
  amount: z.number().positive('投注金额必须大于0'),
});

router.post('/', auth, validate(placeBetSchema), betController.placeBet);
router.get('/my', auth, betController.getMyBets);
router.get('/:id', auth, betController.getBetById);

export default router;
