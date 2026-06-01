import { Request, Response, NextFunction } from 'express';
import * as standingsService from '../services/standings.service';

export async function getGroupStandings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = standingsService.getGroupStandings();
    res.json({ groups });
  } catch (err) {
    next(err);
  }
}
