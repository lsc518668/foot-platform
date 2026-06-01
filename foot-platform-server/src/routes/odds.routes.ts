import { Router } from 'express';
import * as oddsController from '../controllers/odds.controller';

const router = Router();

router.get('/match/:matchId/all', oddsController.getAllByMatchId);
router.get('/:matchId', oddsController.getByMatchId);

export default router;
