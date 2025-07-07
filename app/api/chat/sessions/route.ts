/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-07
 */
/**
 * GET  /api/chat/sessions   – list recent chats
 * POST /api/chat/sessions   – create a new chat
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthJWT } from "@/lib/auth-jwt";     // stateless helper

/* ────────────────────────────────────────────────────────────────── */
/* 1️⃣  Resolve the owner ID (logged-in user or guest UID)           */
/* ────────────────────────────────────────────────────────────────── */
async function ownerId(req: NextRequest): Promise<string | null> {
  const user = await AuthJWT.auth(req);
  if (user) return user.id;

  return (
    req.headers.get("x-finbot-uid") ??
    req.cookies.get("finbot_uid")?.value ??
    null
  );
}

/* ═════════════════════════════════════════════════════════════════ */
/*  GET  – list chat sessions                                        */
/* ═════════════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  try {
    const uid = await ownerId(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: uid },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count:   { select: { messages: true } },
      },
    });

    const payload = sessions.map((s) => ({
      id:           s.id,
      title:        s.title ?? "Untitled chat",
      messageCount: s._count.messages,
      lastMessage:  s.messages[0]?.content.slice(0, 100) ?? "",
      createdAt:    s.createdAt,
      updatedAt:    s.updatedAt,
    }));

    return NextResponse.json({ sessions: payload }, { status: 200 });
  } catch (err) {
    console.error("GET chat sessions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await ownerId(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, language } = await req.json();

    const session = await prisma.chatSession.create({
      data: {
        userId:  uid,
        title:   title ?? "New chat",
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("Create chat session error:", err);
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 },
    );
  }
}