/**
 * @Author: Adithya
 * @Date:   2025-06-04
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 *
 * Enhanced chat endpoint with per‑user Mem0 memory integration and
 * Prisma‑backed user‑ID resolution.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { MistralService } from "@/lib/mistral-service";
import { SerpService } from "@/lib/serp-service";
import { persist, recall } from "@/lib/mem0-service";

const prisma = new PrismaClient();

const mistralService = new MistralService({
  apiKey: process.env.MISTRAL_API_KEY ?? "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
});

const serpService = new SerpService();

export async function POST(request: NextRequest) {
  try {
    const { messages, userProfile, enableWebSearch = false} = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "'messages' array is required and cannot be empty." },
        { status: 400 }
      );
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // 1. Resolve the caller's ID via Prisma
    // ────────────────────────────────────────────────────────────────────────────────
    let userId = "anonymous";
    if (userProfile?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: userProfile.email },
          select: { id: true },
        });
        if (user?.id) userId = user.id;
      } catch (dbErr) {
        console.error("Prisma lookup failed:", dbErr);
      }
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // 2. Persist the latest conversation turn & recall salient memories
    // ────────────────────────────────────────────────────────────────────────────────
    let memoryResults: any[] = [];
    try {
      await persist(messages, userId);
      memoryResults = await recall(messages, userId);
    } catch (memErr) {
      console.error("Mem0 memory error:", memErr);
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // 3. Optional web search (SERP)
    // ────────────────────────────────────────────────────────────────────────────────
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    const query: string = lastUserMessage.content;
    let webResults: any[] = [];

    if (enableWebSearch) {
      try {
        const isBankingQuery = true; // TODO: plug‑in a classifier if needed
        webResults = isBankingQuery
          ? await serpService.searchBanking(query)
          : await serpService.search(query, { num: 6 });
      } catch (searchErr) {
        console.error("Web search failed:", searchErr);
      }
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // 4. Compose cross‑source context for the LLM
    // ────────────────────────────────────────────────────────────────────────────────
    const context = {
      vectorResults: [], // add PGVector / Pinecone hits here later
      webResults,
      memoryResults,
      bankingData: [],
    };

    const profile = {
      firstName: userProfile?.firstName ?? "User",
      preferredLanguage: userProfile?.preferredLanguage ?? "English",
    };

    // ────────────────────────────────────────────────────────────────────────────────
    // 5. Generate the answer with Mistral + Mem0 memories
    // ────────────────────────────────────────────────────────────────────────────────
    const { content, sources } = await mistralService.generateResponseWithSources(
      query,
      context,
      profile
    );

    return NextResponse.json({
      response: content,
      sources,
      memoryHits: memoryResults.length,
      searchResultsCount: webResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Enhanced chat error:", error);
    return NextResponse.json(
      {
        error: error.message ?? "Failed to generate enhanced response",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
