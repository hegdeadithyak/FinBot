/**
 * @Author: Adithya
 * @Date:   2025-06-11
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-11
 */
import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const language = (formData.get("language") as string) || "en"

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call Google Cloud Speech-to-Text API with API key
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: language || "en-US",
            model: "default",
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: buffer.toString("base64"),
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Speech API error:", errorData)
      return NextResponse.json({ error: "Speech recognition failed", details: errorData }, { status: 500 })
    }

    const data = await response.json()

    let transcript = ""
    let detectedLanguage = null

    if (data.results && data.results.length > 0) {
      transcript = data.results[0].alternatives[0].transcript || ""
      if (data.results[0].languageCode) {
        detectedLanguage = data.results[0].languageCode
      }
    }

    return NextResponse.json({ transcript, detectedLanguage })
  } catch (error) {
    console.error("Speech recognition error:", error)
    return NextResponse.json({ error: "Speech recognition failed", details: error }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Speech-to-Text API is working",
    endpoint: "/api/transcribe",
    method: "POST",
    expectedBody: "FormData with 'audio' file and optional 'language' field",
  })
}
