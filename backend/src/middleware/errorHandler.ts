import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. ApiError
  if (err instanceof ApiError) {
    const errorBody: { code: string; message: string; details?: typeof err.details } = {
      code: err.code,
      message: err.message,
    };
    if (err.details && err.details.length > 0) {
      errorBody.details = err.details;
    }
    res.status(err.statusCode).json({
      success: false,
      error: errorBody,
    });
    return;
  }

  // 2. ZodError
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // 3. JWT Error
  if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
  ) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      },
    });
    return;
  }

  // 4. MongoDB duplicate key error (code 11000 / 11001)
  const maybeMongoErr = err as { code?: number; keyPattern?: Record<string, number>; message?: string };
  if (maybeMongoErr && (maybeMongoErr.code === 11000 || maybeMongoErr.code === 11001)) {
    const keyPattern = maybeMongoErr.keyPattern || {};
    let code = 'CONFLICT';
    let message = 'Duplicate resource';

    if ('email' in keyPattern) {
      code = 'EMAIL_ALREADY_EXISTS';
      message = 'An account with this email already exists';
    } else if ('classId' in keyPattern && 'studentId' in keyPattern) {
      code = 'ALREADY_ENROLLED';
      message = 'Already enrolled in this class';
    } else if ('sessionId' in keyPattern && 'studentId' in keyPattern) {
      code = 'ALREADY_MARKED';
      message = 'Attendance has already been marked for this session';
    } else if ('classId' in keyPattern) {
      code = 'SESSION_ALREADY_ACTIVE';
      message = 'An attendance session is already active for this class';
    }

    res.status(409).json({
      success: false,
      error: {
        code,
        message,
      },
    });
    return;
  }

  // 5. Body parser / entity too large (payload > 10kb)
  const httpErr = err as { status?: number; statusCode?: number; type?: string; message?: string };
  if (httpErr && (httpErr.status === 413 || httpErr.statusCode === 413 || httpErr.type === 'entity.too.large')) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds 10kb limit',
      },
    });
    return;
  }

  // 6. Unknown internal error
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
