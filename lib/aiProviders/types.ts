/**
 * AI Provider abstraction — supports Lyzr, OpenAI, Anthropic, Google, etc.
 */

export type AIProviderId = 'lyzr' | 'openai' | 'anthropic' | 'google'

export interface AIProviderOptions {
  agent_id?: string
  model?: string
  user_id?: string
  session_id?: string
  assets?: string[]
}

/** Normalized response shape all providers must produce */
export interface NormalizedAgentResponse {
  status: 'success' | 'error'
  result: Record<string, unknown>
  message?: string
  metadata?: Record<string, unknown>
}

/** Async providers (Lyzr) return task_id; sync providers return immediately */
export type AIProviderInvokeResult =
  | { mode: 'async'; task_id: string; agent_id?: string; user_id?: string; session_id?: string }
  | { mode: 'sync'; response: NormalizedAgentResponse }

export interface AIProvider {
  id: AIProviderId
  /** Whether this provider uses async submit+poll (Lyzr) or sync request (others) */
  isAsync: boolean
  /** Invoke the model. Async: returns task_id. Sync: returns normalized response. */
  invoke(message: string, options?: AIProviderOptions): Promise<AIProviderInvokeResult>
  /** For async providers: poll task by task_id */
  poll?(task_id: string): Promise<{ status: 'processing' } | { status: 'completed'; response: NormalizedAgentResponse } | { status: 'failed'; error: string }>
  /** Whether this provider is configured and usable */
  isConfigured(): boolean
}
