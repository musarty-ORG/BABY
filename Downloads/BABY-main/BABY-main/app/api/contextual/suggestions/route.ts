import type { NextRequest } from 'next/server'
import { contextualAssistant } from '@/lib/contextual-assistant'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectId, currentCode } = body

    if (!userId || !projectId) {
      return Response.json(
        { error: 'userId and projectId are required' },
        { status: 400 }
      )
    }

    const suggestions = await contextualAssistant.generateProactiveSuggestions(
      userId,
      projectId,
      currentCode
    )

    return Response.json({
      success: true,
      suggestions,
      count: suggestions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Suggestions generation error:', error)
    return Response.json(
      {
        error: 'Suggestions generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
