import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/aiProviders'

/**
 * POST /api/agent
 *
 * 1. Submit: body has { message, agent_id?, provider? }
 *    - Lyzr: returns { task_id } for async poll
 *    - OpenAI/Anthropic/Google: returns { success, status: 'completed', response } immediately
 *
 * 2. Poll (Lyzr only): body has { task_id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    // Poll mode (Lyzr async only)
    if (body.task_id && typeof body.task_id === 'string') {
      const provider = getAIProvider()
      if (!provider.poll) {
        return NextResponse.json(
          {
            success: false,
            response: { status: 'error', result: {}, message: 'Provider does not support polling' },
            error: 'Polling not supported',
          },
          { status: 400 }
        )
      }
      const pollResult = await provider.poll(body.task_id)
      if (pollResult.status === 'processing') {
        return NextResponse.json({ status: 'processing' })
      }
      if (pollResult.status === 'failed') {
        return NextResponse.json(
          {
            success: false,
            status: 'failed',
            response: { status: 'error', result: {}, message: pollResult.error },
            error: pollResult.error,
          },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        status: 'completed',
        response: pollResult.response,
        timestamp: new Date().toISOString(),
      })
    }

    // Submit mode
    const message = body.message as string | undefined
    const agent_id = body.agent_id as string | undefined
    const user_id = body.user_id as string | undefined
    const session_id = body.session_id as string | undefined
    const assets = body.assets as string[] | undefined

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: 'message is required' },
          error: 'message is required',
        },
        { status: 400 }
      )
    }

    const provider = getAIProvider()
    const options = { agent_id, user_id, session_id, assets }

    const result = await provider.invoke(message, options)

    if (result.mode === 'async') {
      return NextResponse.json({
        task_id: result.task_id,
        agent_id: result.agent_id,
        user_id: result.user_id,
        session_id: result.session_id,
      })
    }

    // Sync response (OpenAI, Anthropic, Google)
    return NextResponse.json({
      success: true,
      status: 'completed',
      response: result.response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json(
      {
        success: false,
        response: { status: 'error', result: {}, message: errorMsg },
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}
