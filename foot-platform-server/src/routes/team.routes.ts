import { Router } from 'express';
import * as teamController from '../controllers/team.controller';

const router = Router();

router.get('/', teamController.getAll);
router.get('/:id', teamController.getById);

export default router;
