/**
 * @Author: Adithya
 * @Date:   2025-06-11
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-11
 */
import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    const { text, languageCode = "en-US", voiceName, ssmlGender = "FEMALE" } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    // Call Google Cloud Text-to-Speech API with API key
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text,
          },
          voice: {
            languageCode,
            name: voiceName,
            ssmlGender,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.9,
            pitch: 0,
            volumeGainDb: 0,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Text-to-Speech API error:", errorData)
      return NextResponse.json({ error: "Text-to-speech failed", details: errorData }, { status: 500 })
    }

    const data = await response.json()
    const audioContent = Buffer.from(data.audioContent, "base64")

    return new NextResponse(audioContent, {
      headers: {
        "Content-Type": "audio/mp3",
        "Content-Length": audioContent.length.toString(),
      },
    })
  } catch (error) {
    console.error("Text-to-speech error:", error)
    return NextResponse.json({ error: "Text-to-speech failed", details: error }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Text-to-Speech API is working",
    endpoint: "/api/text-to-speech",
    method: "POST",
    expectedBody: {
      text: "Hello world",
      languageCode: "en-US",
      ssmlGender: "FEMALE",
    },
  })
}
