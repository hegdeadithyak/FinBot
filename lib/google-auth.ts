/**
 * @Author: Adithya
 * @Date:   2025-06-11
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-11
 */
interface TokenResponse {
    access_token: string
    expires_in: number
    token_type: string
  }
  
  let cachedToken: { token: string; expiresAt: number } | null = null
  
  export async function getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token
    }
  
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          scope: [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/cloud-translation",
            "https://www.googleapis.com/auth/cloud-speech",
          ].join(" "),
        }),
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        console.error("OAuth token error:", errorData)
        throw new Error(`Failed to get access token: ${response.statusText}`)
      }
  
      const tokenData: TokenResponse = await response.json()
  
      // Cache the token (subtract 60 seconds for safety margin)
      cachedToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000,
      }
  
      return tokenData.access_token
    } catch (error) {
      console.error("Error getting access token:", error)
      throw error
    }
  }
  