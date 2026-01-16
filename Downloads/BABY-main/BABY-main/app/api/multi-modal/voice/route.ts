import type { NextRequest } from 'next/server'
import { multiModalEngine } from '@/lib/multi-modal-engine'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcript, confidence } = body

    if (!transcript || typeof transcript !== 'string') {
      return Response.json(
        { error: 'transcript is required and must be a string' },
        { status: 400 }
      )
    }

    // Process voice command
    const command = await multiModalEngine.parseVoiceCommand(
      transcript,
      confidence || 0.9
    )

    return Response.json({
      success: true,
      command,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Voice command processing error:', error)
    return Response.json(
      {
        error: 'Voice command processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
