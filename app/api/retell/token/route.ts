/**
 * @Author: 
 * @Date:   2025-07-08
 * @Last Modified by:   
 * @Last Modified time: 2025-07-08
 */
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { agent_id } = await request.json()

    if (!agent_id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    // Call Retell API to get access token
    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agent_id,
        metadata: {
          user_id: "web_user",
          session_id: `session_${Date.now()}`,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Retell API error:", errorData)
      return NextResponse.json({ error: "Failed to create web call" }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      access_token: data.access_token,
      call_id: data.call_id,
    })
  } catch (error) {
    console.error("Token generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
