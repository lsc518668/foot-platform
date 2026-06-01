import { Router } from 'express';
import * as matchController from '../controllers/match.controller';

const router = Router();

router.get('/', matchController.getAll);
router.get('/:id', matchController.getById);

export default router;
