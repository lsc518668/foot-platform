import { Request, Response, NextFunction } from 'express';
import * as oddsService from '../services/odds.service';
import { MarketType } from '../types';

export async function getByMatchId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const odds = oddsService.getByMatchId(Number(req.params.matchId), (req.query.market as MarketType) || 'full_time');
    res.json({ odds });
  } catch (err) {
    next(err);
  }
}

export async function getAllByMatchId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const odds = oddsService.getAllByMatchId(Number(req.params.matchId));
    res.json({ odds });
  } catch (err) {
    next(err);
  }
}
