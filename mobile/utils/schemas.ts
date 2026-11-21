import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/;

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters')
    .regex(passwordRegex, 'Password must contain at least one letter and one number'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters')
      .regex(passwordRegex, 'Password must contain at least one letter and one number'),
    role: z.enum(['teacher', 'student']),
    rollNumber: z.string().trim().optional(),
    enrollmentNo: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'student') {
      if (!data.rollNumber || data.rollNumber.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Roll number is required for students',
          path: ['rollNumber'],
        });
      } else if (data.rollNumber.length > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Roll number cannot exceed 30 characters',
          path: ['rollNumber'],
        });
      }
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
