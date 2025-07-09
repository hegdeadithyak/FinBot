/**
 * @Author: 
 * @Date:   2025-07-08
 * @Last Modified by:   
 * @Last Modified time: 2025-07-09
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { agent_id } = await request.json();
    console.log(agent_id);
    if (!agent_id) {
      return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
    }

    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RETELL_API_KEY env var is missing" },
        { status: 500 },
      );
    }

    /* ── create the web call ──────────────────────────────────────────────── */
    const retellRes = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        agent_id,
        metadata: {
          user_id: "web_user",
          session_id: `session_${Date.now()}`,
        },
      }),
    });

    if (!retellRes.ok) {
      const errText = await retellRes.text();
      console.error("Retell API error:", errText);
      return NextResponse.json(
        { error: "Failed to create web call" },
        { status: retellRes.status },
      );
    }

    const { access_token, call_id } = await retellRes.json();
    return NextResponse.json({ access_token, call_id });
  } catch (err) {
    console.error("Token generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
