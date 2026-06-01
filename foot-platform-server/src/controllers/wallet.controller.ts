import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/wallet.service';

export async function getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wallet = walletService.getBalance(req.user!.id);
    res.json({ wallet });
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = walletService.getTransactions(
      req.user!.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
