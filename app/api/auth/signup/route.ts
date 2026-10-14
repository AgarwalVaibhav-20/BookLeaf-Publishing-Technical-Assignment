
import dbConnect from "@/app/lib/dbConnect";
import { AuthorModel } from "@/app/model/Author";
import { UserModel } from "@/app/model/User";
import { authSchema } from "@/app/schemas/authSchema";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/lib/jwt";

export async function POST(request: Request) {
    try {
        // Connect to MongoDB
        await dbConnect();

        // Read request body only once
        const body = await request.json();

        // Validate using Zod
        const result = authSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Validation failed",
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        // Get validated data
        const { name, email, password } = result.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Check existing user
        const existingUser = await UserModel.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: "This email is already registered. Please log in.",
                },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if an author document exists with this email
        const existingAuthor = await AuthorModel.findOne({
            email: normalizedEmail,
        });

        // Create user
        const user = await UserModel.create({
            name: name || existingAuthor?.name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "author",
            author_id: existingAuthor?.author_id,
        });

        // Generate JWT
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Keep signup authentication consistent with login.
        const response = NextResponse.json(
            {
                success: true,
                message: "Signup successful",
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 201 }
        );

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        return response;
    } catch (error) {
        console.error("Error in signup:", error);

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid JSON request body",
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
