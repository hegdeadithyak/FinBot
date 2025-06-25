/**
 * @Author: Adithya
 * @Date:   2025-06-11
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-11
 */
import { type NextRequest, NextResponse } from "next/server"
import { getAccessToken } from "@/lib/google-auth"

export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage = "en" } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Get OAuth access token
    const accessToken = await getAccessToken()

    // Call Google Translate API with OAuth token
    const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: "text",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Translate API error:", errorData)
      return NextResponse.json({ error: "Translation failed", details: errorData }, { status: 500 })
    }

    const data = await response.json()
    const translatedText = data.data.translations[0].translatedText

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Translation failed", details: error }, { status: 500 })
  }
}
