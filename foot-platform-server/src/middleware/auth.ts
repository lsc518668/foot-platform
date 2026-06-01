import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthError } from '../utils/errors';
import { JwtPayload } from '../types';

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 */
export function auth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('未提供认证令牌');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthError('认证令牌格式错误');
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (!decoded.id || !decoded.role) {
      throw new AuthError('认证令牌无效');
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err instanceof AuthError) {
      next(err);
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      next(new AuthError('登录已过期，请重新登录'));
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AuthError('认证令牌无效'));
      return;
    }
    next(err);
  }
}
