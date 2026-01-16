import type { NextRequest } from 'next/server'
import { searchEngine } from '@/lib/search-engine'

export const maxDuration = 15

export async function GET(req: NextRequest) {
  try {
    const testResult = await searchEngine.testConnection()

    return Response.json({
      ...testResult,
      timestamp: new Date().toISOString(),
      environment: {
        hasTavilyKey: !!process.env.TAVILY_API_KEY,
        keyFormat: process.env.TAVILY_API_KEY
          ? process.env.TAVILY_API_KEY.startsWith('tvly-')
            ? 'correct'
            : 'needs_prefix'
          : 'missing',
        keyPreview: process.env.TAVILY_API_KEY
          ? process.env.TAVILY_API_KEY.substring(0, 10) + '...'
          : 'not_set',
      },
    })
  } catch (error) {
    console.error('Search test API error:', error)
    return Response.json(
      {
        success: false,
        message: 'Search test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
