import { Request, Response, NextFunction } from 'express';
import * as betService from '../services/bet.service';

export async function placeBet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId, betType, amount, marketType } = req.body;
    const result = betService.placeBet({
      userId: req.user!.id,
      matchId,
      betType,
      marketType: marketType || 'full_time',
      amount,
    });
    res.status(201).json({
      message: '投注成功',
      bet: result.bet,
      newBalance: result.newBalance,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, limit } = req.query;
    const result = betService.getUserBets(req.user!.id, {
      status: status as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json({ bets: result.bets, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getBetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bet = betService.getById(Number(req.params.id), req.user!.id);
    res.json({ bet });
  } catch (err) {
    next(err);
  }
}
