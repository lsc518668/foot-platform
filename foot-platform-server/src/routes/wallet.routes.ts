import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, walletController.getWallet);
router.get('/transactions', auth, walletController.getTransactions);

export default router;
