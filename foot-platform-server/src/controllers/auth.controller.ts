import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, email, password } = req.body;
    const result = authService.register({ username, email, password });
    res.status(201).json({
      message: '注册成功',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = authService.login({ email, password });
    res.json({
      message: '登录成功',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/admin/login
 */
export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = authService.adminLogin({ email, password });
    res.json({
      message: '管理员登录成功',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = authService.getMe(userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { oldPassword, newPassword } = req.body;
    authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
}
