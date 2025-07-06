/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-07
 */
/**
 * Enhanced Chat endpoint
 * Path: app/api/chat/simple/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, MessageRole } from "@prisma/client";
import { persist, recall, recallAll } from "@/lib/mem0-service";
import { getOrCreateChat, saveMsg } from "@/lib/chat-store";
import { MistralService } from "@/lib/mistral-service";
import { SerpService } from "@/lib/serp-service";
import { ownerId } from "@/lib/owner-id";

const prisma = new PrismaClient();
const mistral = new MistralService({
  apiKey: process.env.MISTRAL_API_KEY ?? "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
});
const serp = new SerpService();

export async function POST(req: NextRequest) {
  try {
    /* ── 0. Parse body ──────────────────────────────── */
    const {
      messages,
      chatSessionId,               // optional
      userProfile = {},
      enableWebSearch = false,
    } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0)
      return NextResponse.json(
        { error: "'messages' array is required and cannot be empty." },
        { status: 400 },
      );

    let userId = ownerId(req);
    /* ── 2. Ensure ChatSession row ───────────────────── */
    const chat = await getOrCreateChat(userId, chatSessionId);

    /* ── 3. Persist USER message (DB & Mem0) ─────────── */
    const lastUser = messages.at(-1);
    if (!lastUser || lastUser.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user." }, { status: 400 });
    }
    await saveMsg(chat.id, userId, MessageRole.USER, lastUser.content);
    await persist(messages, userId);               // Mem0 write

    /* ── 4. Recall memories ─────────────────────────── */
    console.log(userId);
    const memoryResults = await recall(messages, userId).catch((err) => {
      
      console.error("Mem0 recall:", err);
      return [];
    });

    /* ── 5. Optional SERP search ────────────────────── */
    const query = lastUser.content;
    let webResults: any[] = [];
    if (enableWebSearch) {
      try {
        const isBanking = true;                    // placeholder classifier
        webResults = isBanking
          ? await serp.searchBanking(query)
          : await serp.search(query, { num: 6 });
      } catch (e) {
        console.error("SERP error:", e);
      }
    }

    /* ── 6. Build context & profile ─────────────────── */
    const context = {
      vectorResults: [],
      webResults,
      memoryResults:memoryResults,
      bankingData: [],
    };
    const profile = {
      firstName: userProfile.firstName ?? "User",
      preferredLanguage: userProfile.preferredLanguage ?? "English",
    };

    /* ── 7. Generate assistant reply ─────────────────── */
    const { content, sources } = await mistral.generateResponseWithSources(
      query,
      context,
      profile,
    );

    /* ── 8. Save ASSISTANT message ───────────────────── */
    await saveMsg(chat.id, userId, MessageRole.ASSISTANT, content);

    /* ── 9. Return to client ─────────────────────────── */
    return NextResponse.json(
      {
        chatSessionId: chat.id,
        response: content,
        sources,
        memoryHits: memoryResults.length,
        searchResultsCount: webResults.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      {
        error: err.message ?? "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
