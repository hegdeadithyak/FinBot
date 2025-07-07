/**
 * @Author: Adithya
 * @Date:   2025-07-07
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-07
 */
/*  app/api/chat/summary/route.ts */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MistralService } from "@/lib/mistral-service";

const mistral = new MistralService({
  apiKey: "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
});

export async function POST(req: NextRequest) {
  try {
    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 });
    }

    /* 1️⃣  pull last 10 turns */
    const messages = await prisma.message.findMany({
      where: { chatSessionId: chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });

    const text = messages
      .reverse()                                   // chronological order
      .map((m) => `${m.role === "USER" ? "User:" : "Bot:"} ${m.content}`)
      .join("\n");

    /* 2️⃣  ask Mistral */
    const { content } = await mistral.generateResponse(
      [
        { role: "system", content: "Summarize in three words or fewer." },
        { role: "user",   content: text },
      ],
      { temperature: 0.3, maxTokens: 8 },
    );

    const title = content.trim().replace(/[".]/g, ""); // quick clean-up
    return NextResponse.json({ title }, { status: 200 });
  } catch (err) {
    console.error("summary api error:", err);
    return NextResponse.json({ error: "Failed to summarise" }, { status: 500 });
  }
}
