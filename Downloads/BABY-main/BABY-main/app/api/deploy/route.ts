import type { NextRequest } from 'next/server'
import { deploymentService } from '@/lib/deployment-service'
import { pipelineLogger } from '@/lib/pipeline-logger'
import type { DeploymentRequest } from '@/types/pipeline'
import { withErrorHandler } from '@/lib/error-handler'
import { deploymentRequestSchema } from '@/lib/validation-schemas'
import { requireAuth, checkRateLimit } from '@/lib/auth-middleware'
import { analyticsEngine } from '@/lib/analytics-engine'

export const maxDuration = 60

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Authenticate user
  const session = await requireAuth(req)

  // Rate limiting - 10 deployments per hour for regular users
  if (session.authType !== 'api_key') {
    await checkRateLimit(req, session.id, 10, 3600)
  }

  const validatedBody = deploymentRequestSchema.parse(await req.json())
  const { codeFiles, projectName, requestId: pipelineRequestId } = validatedBody

  // Check if required environment variables are available
  if (!process.env.GITHUB_TOKEN || !process.env.VERCEL_TOKEN) {
    return Response.json(
      {
        success: false,
        error: 'Deployment not configured. Missing GitHub or Vercel tokens.',
      },
      { status: 500 }
    )
  }

  const deploymentRequest: DeploymentRequest = {
    codeFiles,
    projectName,
    requestId: pipelineRequestId || requestId,
    userId: session.id, // Add user tracking
  }

  await pipelineLogger.logStage(
    requestId,
    'DEPLOYMENT_START',
    deploymentRequest,
    null,
    0
  )

  const result = await deploymentService.deployToVercel(deploymentRequest)

  await pipelineLogger.logStage(
    requestId,
    'DEPLOYMENT_COMPLETE',
    deploymentRequest,
    result,
    0
  )

  // Track deployment
  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/deploy',
    method: 'POST',
    status_code: result.success ? 200 : 500,
    user_id: session.id,
    metadata: {
      projectName,
      authType: session.authType,
      deploymentSuccess: result.success,
    },
  })

  return Response.json(result)
})
