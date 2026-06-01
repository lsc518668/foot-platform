import { Request, Response, NextFunction } from 'express';
import * as teamService from '../services/team.service';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = req.query.group as string | undefined;
    const teams = teamService.getAll(group);
    res.json({ teams });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = teamService.getById(Number(req.params.id));
    res.json({ team });
  } catch (err) {
    next(err);
  }
}
