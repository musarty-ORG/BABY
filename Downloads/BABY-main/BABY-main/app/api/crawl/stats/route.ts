import type { NextRequest } from 'next/server'
import { crawlEngine } from '@/lib/crawl-engine'

export const maxDuration = 10

export async function GET(req: NextRequest) {
  try {
    const stats = await crawlEngine.getCrawlStats()

    return Response.json({
      ...stats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error('Crawl stats API error:', error)
    return Response.json(
      {
        error: 'Failed to get crawl stats',
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
    const clearedCount = await crawlEngine.clearCache(pattern || undefined)

    return Response.json({
      message: 'Crawl cache cleared successfully',
      clearedEntries: clearedCount,
      pattern: pattern || 'all',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Crawl cache clear API error:', error)
    return Response.json(
      {
        error: 'Failed to clear crawl cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
