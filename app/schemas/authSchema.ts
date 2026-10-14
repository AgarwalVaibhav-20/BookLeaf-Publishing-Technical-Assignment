import { z } from "zod";

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.");

export const authSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters.")
        .max(50, "Name must not exceed 50 characters."),
    email: emailSchema,
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .max(50, "Password must not exceed 50 characters.")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
        .regex(/[0-9]/, "Password must contain at least one number.")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character."),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required."),
});

export type AuthInput = z.infer<typeof authSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
