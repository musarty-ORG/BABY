import type { NextRequest } from 'next/server'
import { crawlEngine } from '@/lib/crawl-engine'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, ...options } = body

    if (!url || typeof url !== 'string') {
      return Response.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      )
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json(
        { error: 'Crawl service not configured' },
        { status: 500 }
      )
    }

    const result = await crawlEngine.crawlDocumentation(url, options)

    return Response.json(result)
  } catch (error) {
    console.error('Documentation crawl API error:', error)
    return Response.json(
      {
        error: 'Documentation crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
