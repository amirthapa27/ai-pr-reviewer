import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AIProviderOptions, NormalizedAgentResponse } from './types'
import { PR_REVIEW_SYSTEM_PROMPT } from './prompts'
import parseLLMJson from '@/lib/jsonParser'

function extractResult(content: string): NormalizedAgentResponse {
  const parsed = parseLLMJson(content)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const hasSchema = 'overall_score' in parsed || 'code_quality' in parsed
    if (hasSchema) {
      return { status: 'success', result: parsed as Record<string, unknown> }
    }
    if ('result' in parsed && parsed.result) {
      return { status: 'success', result: parsed.result as Record<string, unknown> }
    }
  }
  return { status: 'success', result: { text: content } }
}

export const googleProvider: AIProvider = {
  id: 'google',
  isAsync: false,

  isConfigured() {
    return !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '')
  },

  async invoke(message: string, options?: AIProviderOptions): Promise<
    | { mode: 'sync'; response: NormalizedAgentResponse }
    | { mode: 'async'; task_id: string }
  > {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY is required for Google provider')

    const modelId = options?.model || process.env.GOOGLE_MODEL || 'gemini-1.5-flash'
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: PR_REVIEW_SYSTEM_PROMPT,
    })

    const result = await model.generateContent(message)
    const response = result.response
    const text = (typeof response.text === 'function' ? response.text() : response.text)?.trim() || ''
    if (!text) {
      return {
        mode: 'sync',
        response: { status: 'error', result: {}, message: 'Empty response from Google Gemini' },
      }
    }

    const normResponse = extractResult(text)
    return { mode: 'sync', response: normResponse }
  },
}
