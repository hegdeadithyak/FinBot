/**
 * @Author: 
 * @Date:   2025-07-09
 * @Last Modified by:   
 * @Last Modified time: 2025-07-09
 */
interface TranslationResponse {
  translatedText: string
  detectedSourceLanguage?: string
}

interface TranslationError {
  error: string
  fallback: string
}

class TranslationService {
  private apiKey: string
  private baseUrl = "https://translation.googleapis.com/language/translate/v2"
  private cache = new Map<string, string>()

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getCacheKey(text: string, targetLang: string): string {
    return `${text}_${targetLang}`
  }

  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage = "auto",
  ): Promise<TranslationResponse | TranslationError> {
    // Return original text if target is English or same as source
    if (targetLanguage === "en" || targetLanguage === sourceLanguage) {
      return { translatedText: text }
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, targetLanguage)
    if (this.cache.has(cacheKey)) {
      return { translatedText: this.cache.get(cacheKey)! }
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage === "auto" ? undefined : sourceLanguage,
          format: "text",
        }),
      })

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || "Translation failed")
      }

      const translatedText = data.data.translations[0].translatedText
      const detectedSourceLanguage = data.data.translations[0].detectedSourceLanguage

      // Cache the result
      this.cache.set(cacheKey, translatedText)

      return {
        translatedText,
        detectedSourceLanguage,
      }
    } catch (error) {
      console.error("Translation error:", error)
      return {
        error: error instanceof Error ? error.message : "Translation failed",
        fallback: text,
      }
    }
  }

  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage = "auto",
  ): Promise<(TranslationResponse | TranslationError)[]> {
    // Process in batches to avoid API limits
    const batchSize = 10
    const results: (TranslationResponse | TranslationError)[] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchPromises = batch.map((text) => this.translateText(text, targetLanguage, sourceLanguage))

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export default TranslationService
