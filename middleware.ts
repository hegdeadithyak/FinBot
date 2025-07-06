/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

export function middleware(req: NextRequest) {
  const uid = req.cookies.get("finbot_uid")?.value ?? uuid();

  /* always pass the uid to the API via header */
  const res       = NextResponse.next();
  res.headers.set("x-finbot-uid", uid);

  /* set cookie if new */
  if (!req.cookies.get("finbot_uid")) {
    res.cookies.set({
      name: "finbot_uid",
      value: uid,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }
  return res;
}
