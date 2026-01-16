import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { requireAdmin } from '@/lib/auth-middleware'
import { databaseService } from '@/lib/database-service'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const hours = Number.parseInt(url.searchParams.get('hours') || '24')

  let query = `
    SELECT metric_name, metric_value, metric_unit, category, tags, timestamp
    FROM system_metrics 
    WHERE timestamp > NOW() - INTERVAL '${hours} hours'
  `

  if (category) {
    query += ` AND category = '${category}'`
  }

  query += ` ORDER BY timestamp DESC LIMIT 1000`

  const metrics = await databaseService.sql.unsafe(query)

  // Group metrics by category
  const groupedMetrics = metrics.reduce((acc: any, metric: any) => {
    if (!acc[metric.category]) {
      acc[metric.category] = []
    }
    acc[metric.category].push(metric)
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    metrics: groupedMetrics,
    total: metrics.length,
    timeRange: `${hours} hours`,
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const { metric_name, metric_value, metric_unit, category, tags } =
    await req.json()

  await databaseService.recordSystemMetric({
    metric_name,
    metric_value,
    metric_unit,
    category,
    tags,
  })

  return NextResponse.json({
    success: true,
    message: 'Metric recorded successfully',
  })
})
