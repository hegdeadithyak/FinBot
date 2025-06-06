/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value

    if (sessionToken) {
      await AuthService.logout(sessionToken)
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    })

    response.cookies.delete("session-token")

    return response
  } catch (error) {
    console.error("Logout error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Logout failed",
      },
      { status: 500 },
    )
  }
}
