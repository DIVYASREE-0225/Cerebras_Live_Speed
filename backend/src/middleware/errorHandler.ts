import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/validation.ts';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON request body.',
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error.',
  });
}
