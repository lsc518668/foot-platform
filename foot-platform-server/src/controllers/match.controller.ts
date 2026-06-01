import { Request, Response, NextFunction } from 'express';
import * as matchService from '../services/match.service';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, stage, date, page, limit } = req.query;
    const result = matchService.getAll({
      status: status as string,
      stage: stage as string,
      date: date as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json({ matches: result.matches, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const match = matchService.getById(Number(req.params.id));
    res.json({ match });
  } catch (err) {
    next(err);
  }
}
