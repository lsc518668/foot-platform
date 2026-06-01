import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Admin authorization middleware.
 * Must be used AFTER the `auth` middleware (req.user must exist).
 * Checks that the authenticated user has admin role.
 */
export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new ForbiddenError('请先登录'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('需要管理员权限'));
  }

  next();
}
