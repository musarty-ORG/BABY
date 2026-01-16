import type { NextRequest } from 'next/server'
import { crawlEngine } from '@/lib/crawl-engine'
import { withErrorHandler } from '@/lib/error-handler'
import { requireAuth, checkRateLimit } from '@/lib/auth-middleware'
import { analyticsEngine } from '@/lib/analytics-engine'

export const maxDuration = 60

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Authenticate user
  const session = await requireAuth(req)

  // Rate limiting - 20 crawl requests per hour
  if (session.authType !== 'api_key') {
    await checkRateLimit(req, session.id, 20, 3600)
  }

  const body = await req.json()
  const {
    url,
    maxDepth = 2,
    maxBreadth = 50,
    limit = 100,
    extractDepth = 'basic',
    selectPaths,
    excludePaths,
    selectDomains,
    excludeDomains,
    categories,
    instructions,
    includeImages = false,
    includePdfs = false,
    includeRawHtml = false,
  } = body

  if (!url || typeof url !== 'string') {
    return Response.json(
      { error: 'URL is required and must be a string' },
      { status: 400 }
    )
  }

  if (!process.env.TAVILY_API_KEY) {
    return Response.json(
      { error: 'Crawl service not configured - TAVILY_API_KEY missing' },
      { status: 500 }
    )
  }

  // Validate parameters
  if (maxDepth < 1 || maxDepth > 5) {
    return Response.json(
      { error: 'maxDepth must be between 1 and 5' },
      { status: 400 }
    )
  }

  if (limit > 1000) {
    return Response.json(
      { error: 'limit cannot exceed 1000 pages' },
      { status: 400 }
    )
  }

  const result = await crawlEngine.crawl(url, {
    maxDepth,
    maxBreadth,
    limit,
    extractDepth,
    selectPaths,
    excludePaths,
    selectDomains,
    excludeDomains,
    categories,
    instructions,
    includeImages,
    includePdfs,
    includeRawHtml,
  })

  // Track crawl operation
  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/crawl',
    method: 'POST',
    status_code: 200,
    user_id: session.id,
    metadata: {
      url,
      maxDepth,
      limit,
      authType: session.authType,
      pagesFound: result.results?.length || 0,
    },
  })

  return Response.json(result)
})
