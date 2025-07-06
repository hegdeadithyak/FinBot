/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
import { NextResponse } from "next/server";

export async function POST() {
  return new Response(null, {
    status: 200,
    headers: { "Set-Cookie": "finbot_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" },
  });
}
