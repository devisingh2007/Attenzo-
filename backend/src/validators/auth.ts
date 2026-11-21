import { z } from 'zod';

// Password must be 8–72 characters, with at least one letter and one digit
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,72}$/;

const baseRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters')
    .regex(passwordRegex, 'Password must contain at least one letter and one number'),
});

const studentRegisterSchema = baseRegisterSchema
  .extend({
    role: z.literal('student'),
    rollNumber: z
      .string()
      .trim()
      .min(1, 'Roll number is required for students')
      .max(30, 'Roll number cannot exceed 30 characters'),
    enrollmentNo: z
      .string()
      .trim()
      .min(1, 'Enrollment number cannot be empty')
      .max(30, 'Enrollment number cannot exceed 30 characters')
      .optional(),
  })
  .strict();

const teacherRegisterSchema = baseRegisterSchema
  .extend({
    role: z.literal('teacher'),
  })
  .strict();

export const registerSchema = z.discriminatedUnion('role', [
  studentRegisterSchema,
  teacherRegisterSchema,
]);

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(72, 'Password cannot exceed 72 characters'),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
