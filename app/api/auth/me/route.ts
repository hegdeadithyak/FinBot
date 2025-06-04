/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "No session token",
        },
        { status: 401 },
      )
    }

    const user = await AuthService.getUserBySession(sessionToken)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired session",
        },
        { status: 401 },
      )
    }

    // Refresh session
    await AuthService.refreshSession(sessionToken)

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error("Get user error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get user",
      },
      { status: 500 },
    )
  }
}
