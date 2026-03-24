import { z } from 'zod';
import { CATEGORIES } from '@/constants/categories';

export const recipeSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or less'),
  ingredients: z
    .array(z.string().min(1, 'Ingredient cannot be empty'))
    .min(1, 'At least one ingredient is required'),
  instructions: z
    .string()
    .min(1, 'Instructions are required')
    .max(10000, 'Instructions must be 10000 characters or less'),
  prep_time: z.coerce
    .number()
    .int()
    .min(0, 'Prep time must be 0 or more minutes'),
  cook_time: z.coerce
    .number()
    .int()
    .min(0, 'Cook time must be 0 or more minutes'),
  servings: z.coerce
    .number()
    .int()
    .min(1, 'Servings must be at least 1'),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  image_url: z
    .string()
    .url('Must be a valid URL')
    .nullable()
    .or(z.literal(''))
    .or(z.null()),
  is_public: z.boolean(),
  is_anonymous: z.boolean(),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
