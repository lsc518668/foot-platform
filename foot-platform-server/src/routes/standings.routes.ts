import { Router } from 'express';
import * as standingsController from '../controllers/standings.controller';

const router = Router();

router.get('/', standingsController.getGroupStandings);

export default router;
