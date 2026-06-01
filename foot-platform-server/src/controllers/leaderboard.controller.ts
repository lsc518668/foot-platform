import { Request, Response, NextFunction } from 'express';
import * as leaderboardService from '../services/leaderboard.service';

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const leaderboard = leaderboardService.getLeaderboard(Math.min(limit, 200));
    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
}

export async function getMyRank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rank = leaderboardService.getUserRank(req.user!.id);
    res.json({ rank });
  } catch (err) {
    next(err);
  }
}
