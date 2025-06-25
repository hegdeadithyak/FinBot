/**
 * @Author: Adithya
 * @Date:   2025-06-11
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-11
 */
import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 5

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    // Call Google Translate API for language detection with API key
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Language Detection API error:", errorData)
      return NextResponse.json({ error: "Language detection failed", details: errorData }, { status: 500 })
    }

    const data = await response.json()
    const language = data.data.detections[0][0].language
    const confidence = data.data.detections[0][0].confidence

    return NextResponse.json({ language, confidence })
  } catch (error) {
    console.error("Language detection error:", error)
    return NextResponse.json({ error: "Language detection failed", details: error }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Language Detection API is working",
    endpoint: "/api/detect-language",
    method: "POST",
    expectedBody: { text: "Hello world" },
  })
}
