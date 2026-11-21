import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../config/constants';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const sessionCodeRegex = /^\d{6}$/;

export const markAttendanceSchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID'),
    sessionCode: z.string().regex(sessionCodeRegex, 'Session code must be exactly 6 digits'),
  })
  .strict();

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const manualAttendanceSchema = z
  .object({
    sessionId: z.string().regex(objectIdRegex, 'Invalid session ID'),
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID'),
    status: z.enum(['present', 'absent']),
  })
  .strict();

export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

export const sessionIdParamSchema = z
  .object({
    sessionId: z.string().regex(objectIdRegex, 'Invalid session ID'),
  })
  .strict();

export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;

export const classIdParamSchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID'),
  })
  .strict();

export type ClassIdParamInput = z.infer<typeof classIdParamSchema>;

export const studentIdParamSchema = z
  .object({
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID'),
  })
  .strict();

export type StudentIdParamInput = z.infer<typeof studentIdParamSchema>;

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  });

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export const studentAttendanceQuerySchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID'),
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  });

export type StudentAttendanceQueryInput = z.infer<typeof studentAttendanceQuerySchema>;

export const myAttendanceQuerySchema = z
  .object({
    classId: z.string().regex(objectIdRegex, 'Invalid class ID').optional(),
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  });

export type MyAttendanceQueryInput = z.infer<typeof myAttendanceQuerySchema>;
