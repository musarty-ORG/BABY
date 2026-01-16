import type { NextRequest } from 'next/server'
import { searchEngine } from '@/lib/search-engine'

export const maxDuration = 15

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return Response.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const relatedQueries = await searchEngine.getRelatedQueries(query)

    return Response.json({
      query,
      relatedQueries,
      count: relatedQueries.length,
    })
  } catch (error) {
    console.error('Related queries API error:', error)
    return Response.json(
      {
        error: 'Failed to get related queries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
