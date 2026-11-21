import { z } from 'zod';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants';

const subjectCodeRegex = /^[A-Za-z0-9-]+$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createClassSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name cannot exceed 80 characters'),
    subjectCode: z
      .string()
      .trim()
      .min(2, 'Subject code must be at least 2 characters')
      .max(20, 'Subject code cannot exceed 20 characters')
      .regex(subjectCodeRegex, 'Subject code must contain only letters, numbers, and hyphens')
      .transform((val) => val.toUpperCase()),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name cannot exceed 80 characters')
      .optional(),
    subjectCode: z
      .string()
      .trim()
      .min(2, 'Subject code must be at least 2 characters')
      .max(20, 'Subject code cannot exceed 20 characters')
      .regex(subjectCodeRegex, 'Subject code must contain only letters, numbers, and hyphens')
      .transform((val) => val.toUpperCase())
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.subjectCode !== undefined || data.description !== undefined,
    { message: 'At least one field (name, subjectCode, description) must be provided' }
  );

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const classQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .strict();

export type ClassQueryInput = z.infer<typeof classQuerySchema>;

export const classIdParamSchema = z
  .object({
    id: z.string().regex(objectIdRegex, 'Invalid class ID'),
  })
  .strict();

export type ClassIdParamInput = z.infer<typeof classIdParamSchema>;

export const joinClassSchema = z
  .object({
    joinCode: z
      .string()
      .trim()
      .min(1, 'Join code is required')
      .max(30, 'Join code cannot exceed 30 characters')
      .transform((val) => val.toUpperCase()),
  })
  .strict();

export type JoinClassInput = z.infer<typeof joinClassSchema>;

export const classStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    search: z.string().trim().optional(),
  })
  .strict();

export type ClassStudentsQueryInput = z.infer<typeof classStudentsQuerySchema>;

export const removeStudentParamsSchema = z
  .object({
    id: z.string().regex(objectIdRegex, 'Invalid class ID'),
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID'),
  })
  .strict();

export type RemoveStudentParamsInput = z.infer<typeof removeStudentParamsSchema>;

