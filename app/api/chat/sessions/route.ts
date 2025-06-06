/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const sessionToken = request.cookies.get("session-token")?.value
    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const user = await AuthService.getUserBySession(sessionToken)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
        },
        { status: 401 },
      )
    }

    // Get user's chat sessions
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const formattedSessions = chatSessions.map((session:any) => ({
      id: session.id,
      title: session.title,
      summary: session.summary,
      language: session.language,
      messageCount: session._count.messages,
      lastMessage: session.messages[0]?.content?.substring(0, 100) + "..." || "",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error("Get chat sessions error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get chat sessions",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionToken = request.cookies.get("session-token")?.value
    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const user = await AuthService.getUserBySession(sessionToken)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
        },
        { status: 401 },
      )
    }

    const { title, language } = await request.json()

    // Create new chat session
    const chatSession = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: title || "New Chat",
        language: language || user.preferredLanguage,
      },
    })

    return NextResponse.json(
      {
        success: true,
        session: chatSession,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create chat session error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create chat session",
      },
      { status: 500 },
    )
  }
}
