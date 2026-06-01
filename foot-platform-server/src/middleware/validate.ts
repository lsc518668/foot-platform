import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Factory function that creates a validation middleware from a Zod schema.
 * Validates req.body against the schema. On failure, returns 400 with details.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller.register);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err); // Will be handled by errorHandler
      } else {
        next(err);
      }
    }
  };
}
