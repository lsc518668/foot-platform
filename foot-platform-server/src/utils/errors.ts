/**
 * Custom error classes for consistent HTTP error responses.
 */

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = '未登录或登录已过期，请重新登录') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '没有权限执行此操作') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '请求的资源不存在') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = '余额不足') {
    super(message, 400);
    this.name = 'InsufficientBalanceError';
  }
}

export class BetClosedError extends AppError {
  constructor(message: string = '该比赛已截止投注') {
    super(message, 400);
    this.name = 'BetClosedError';
  }
}

export class UserFrozenError extends AppError {
  constructor(message: string = '账户已被冻结，无法操作') {
    super(message, 403);
    this.name = 'UserFrozenError';
  }
}
