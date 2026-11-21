import { z } from 'zod';
import {
  DEFAULT_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  MAX_SESSION_MINUTES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../config/constants';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const startSessionSchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID'),
    durationMinutes: z
      .number()
      .int()
      .min(MIN_SESSION_MINUTES, `Duration must be at least ${MIN_SESSION_MINUTES} minute`)
      .max(MAX_SESSION_MINUTES, `Duration cannot exceed ${MAX_SESSION_MINUTES} minutes`)
      .optional()
      .default(DEFAULT_SESSION_MINUTES),
    title: z
      .string()
      .trim()
      .max(80, 'Title cannot exceed 80 characters')
      .optional()
      .default(''),
  })
  .strict();

export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const sessionQuerySchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID'),
    status: z.enum(['active', 'ended']).optional(),
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .strict();

export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;

export const sessionIdParamSchema = z
  .object({
    id: z.string().regex(objectIdRegex, 'Invalid session ID'),
  })
  .strict();

export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;
