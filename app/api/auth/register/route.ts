/**
 * @Author: 
 * @Date:   2025-07-06
 * @Last Modified by:   
 * @Last Modified time: 2025-07-08
 */

/**
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthService, makeCookie } from "@/lib/auth-service";   // makeCookie encodes finbot_session
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username:          z.string().optional(),
  firstName:         z.string().optional(),
  lastName:          z.string().optional(),
  preferredLanguage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = registerSchema.parse(await req.json());
    const { user, token } = await AuthService.register(data);
    const guestId =
      req.headers.get("x-finbot-uid") ??
      req.cookies.get("finbot_uid")?.value ??
      null;

    if (guestId && guestId !== user.id) {
      await prisma.$transaction([
        prisma.chatSession.updateMany({
          where: { userId: guestId },
          data:  { userId: user.id },
        }),
        prisma.message.updateMany({
          where: { userId: guestId },
          data:  { userId: user.id },
        }),
      ]);
    }

    /* 4️⃣ build response with Set-Cookie */
    const res = NextResponse.json({ user }, { status: 201 });
    //@ts-ignore
    res.cookies.set(makeCookie(token));           // finbot_session
    res.cookies.delete("session-token");          // clean up legacy cookie
    return res;
  } catch (err) {
    console.error("Registration error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed" },
      { status: 400 },
    );
  }
}
