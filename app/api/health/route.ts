export async function GET() {
  try {
    // Basic health check
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        vertexAI: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        neonDB: !!process.env.NEON_DATABASE_URL,
        nextAuth: !!process.env.NEXTAUTH_SECRET,
        vercel: !!process.env.VERCEL_TOKEN,
        github: !!process.env.GITHUB_TOKEN,
      },
    })
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: "Health check failed",
      },
      { status: 500 },
    )
  }
}
