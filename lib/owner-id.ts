/**
 * @Author: Adithya
 * @Date:   2025-07-07
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-07
 */
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

/** Returns the canonical ID for the caller (userId or guest UID) */
export function ownerId(req: NextRequest): string {
  /* 1️⃣  check JWT first */
  const cookie = req.cookies.get("finbot_session")?.value;
  if (cookie) {
    try {
      const { userId } = jwt.verify(cookie, JWT_SECRET) as { userId: string };
      return userId;
    } catch {/* fall through */}
  }

  /* 2️⃣  fall back to visitor UID (always present) */
  return (
    req.headers.get("x-finbot-uid") ||          // set by middleware
    req.cookies.get("finbot_uid")?.value ||     // just in case
    "anonymous"                                 // very unlikely
  );
}
