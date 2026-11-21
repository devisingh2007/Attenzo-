import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodObject } from 'zod';
import { ApiError, ErrorDetail } from '../utils/ApiError';

export interface ValidationSchema {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const details: ErrorDetail[] = [];
      let parsedBody: unknown = req.body;
      let parsedParams: unknown = req.params;
      let parsedQuery: unknown = req.query;

      if (schemas.body) {
        let bodySchema = schemas.body;
        if (bodySchema instanceof ZodObject) {
          bodySchema = bodySchema.strict();
        }
        const result = bodySchema.safeParse(req.body);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          parsedBody = result.data;
        }
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          parsedParams = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          parsedQuery = result.data;
        }
      }

      if (details.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
      }

      req.validated = {
        body: parsedBody,
        params: parsedParams,
        query: parsedQuery,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
