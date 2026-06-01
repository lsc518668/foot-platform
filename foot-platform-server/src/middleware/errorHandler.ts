import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent JSON responses.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // AppError subclasses have statusCode
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      error: '请求参数校验失败',
      details,
    });
    return;
  }

  // Unexpected errors
  console.error('[Error]', err);
  res.status(500).json({
    error: '服务器内部错误，请稍后重试',
  });
}
