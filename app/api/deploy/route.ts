import type { NextRequest } from "next/server"
import { deploymentService } from "@/lib/deployment-service"
import { pipelineLogger } from "@/lib/pipeline-logger"
import type { DeploymentRequest } from "@/types/pipeline"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const requestId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const body = await req.json()
    const { codeFiles, projectName, requestId: pipelineRequestId } = body

    if (!codeFiles || !projectName) {
      return Response.json(
        {
          success: false,
          error: "Missing required fields: codeFiles and projectName",
        },
        { status: 400 },
      )
    }

    // Check if required environment variables are available
    if (!process.env.GITHUB_TOKEN || !process.env.VERCEL_TOKEN) {
      return Response.json(
        {
          success: false,
          error: "Deployment not configured. Missing GitHub or Vercel tokens.",
        },
        { status: 500 },
      )
    }

    const deploymentRequest: DeploymentRequest = {
      codeFiles,
      projectName,
      requestId: pipelineRequestId || requestId,
    }

    await pipelineLogger.logStage(requestId, "DEPLOYMENT_START", deploymentRequest, null, 0)

    const result = await deploymentService.deployToVercel(deploymentRequest)

    await pipelineLogger.logStage(requestId, "DEPLOYMENT_COMPLETE", deploymentRequest, result, 0)

    return Response.json(result)
  } catch (error) {
    await pipelineLogger.logError(requestId, "DEPLOYMENT", `Deployment failed: ${error}`, false)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown deployment error",
      },
      { status: 500 },
    )
  }
}
