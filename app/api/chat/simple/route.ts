/**
 * @Author: 
 * @Date:   2025-07-07
 * @Last Modified by:   
 * @Last Modified time: 2025-07-08
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, MessageRole } from "@prisma/client";
import { persist, recall, recallAll } from "@/lib/mem0-service";
import { getOrCreateChat, saveMsg } from "@/lib/chat-store";
import { MistralService } from "@/lib/mistral-service";
import { SerpService } from "@/lib/serp-service";
import { ownerId } from "@/lib/owner-id";
import call_bert from "@/lib/distillbert-service";

const prisma = new PrismaClient();
const mistral = new MistralService({
  apiKey: process.env.MISTRAL_API_KEY ?? "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
});
const serp = new SerpService();

export async function POST(req: NextRequest) {
  try {
    let {
      messages,
      chatSessionId,               
      userProfile = {},
      enableWebSearch = false,
    } = await req.json();
    console.log(messages.at(-1).content);
    const call_response = await call_bert(messages.at(-1).content);
    console.log(call_response);
    if(call_response.mode== "FAQ"){
      enableWebSearch = true;
    }else if(call_response.mode=="Fallback"){
        messages.at(-1).content+"Do not Answer the question say the user that you are only limited to the Finance Sector."
    }else{
        
    }
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
  } catch (err: unknown) {
  console.error("Chat route error:", err);

  const isDebug = process.env.SHOW_ERROR_DETAILS === "true";      // <─ new flag

  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

  const stack =
    isDebug && err instanceof Error ? err.stack : undefined;

  return NextResponse.json(
    { error: message, details: stack },
    { status: 500 },
  );
}

}
