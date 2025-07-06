/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
import { AuthJWT } from "@/lib/auth-jwt";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await AuthJWT.auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user }, { status: 200 });
}
