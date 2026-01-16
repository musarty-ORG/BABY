import type { NextRequest } from 'next/server'
import { searchEngine } from '@/lib/search-engine'

export const maxDuration = 10

export async function GET(req: NextRequest) {
  try {
    const stats = await searchEngine.getSearchStats()

    return Response.json({
      ...stats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error('Search stats API error:', error)
    return Response.json(
      {
        error: 'Failed to get search stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pattern = searchParams.get('pattern')

  try {
    const clearedCount = await searchEngine.clearCache(pattern || undefined)

    return Response.json({
      message: 'Cache cleared successfully',
      clearedEntries: clearedCount,
      pattern: pattern || 'all',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cache clear API error:', error)
    return Response.json(
      {
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
