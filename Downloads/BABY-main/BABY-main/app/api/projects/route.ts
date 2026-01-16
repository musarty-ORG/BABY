import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { requireAuth } from '@/lib/auth-middleware'
import { databaseService } from '@/lib/database-service'
import { analyticsEngine } from '@/lib/analytics-engine'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['web', 'mobile', 'desktop', 'api', 'fullstack']),
  framework: z.string().optional(),
  description: z.string().optional(),
  goals: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  repository_url: z.string().url().optional(),
})

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth(req)

  const projects = await databaseService.getProjectContextsByUser(
    session.userId || session.id
  )

  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/projects',
    method: 'GET',
    status_code: 200,
    user_id: session.userId || session.id,
  })

  return NextResponse.json({
    success: true,
    projects,
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth(req)

  const projectData = createProjectSchema.parse(await req.json())

  const project = await databaseService.createProjectContext({
    user_id: session.userId || session.id,
    ...projectData,
  })

  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/projects',
    method: 'POST',
    status_code: 201,
    user_id: session.userId || session.id,
    metadata: {
      projectType: projectData.type,
      framework: projectData.framework,
    },
  })

  return NextResponse.json(
    {
      success: true,
      project,
    },
    { status: 201 }
  )
})
