import { z } from "zod";

export const signInSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Please enter a valid email address.'),
    password: z.string()
        .trim()
        .min(8, 'Password must be at least 8 characters long.'),
})

export type SignInFormValues = z.infer<typeof signInSchema>;