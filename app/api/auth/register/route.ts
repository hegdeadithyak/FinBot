/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  preferredLanguage: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = registerSchema.parse(body)

    // Register user
    const result = await AuthService.register(validatedData)

    // Set session cookie
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        message: "User registered successfully",
      },
      { status: 201 },
    )

    response.cookies.set("session-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 400 },
    )
  }
}
