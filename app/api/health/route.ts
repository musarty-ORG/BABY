export async function GET() {
  try {
    // Basic health check
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        groq: !!process.env.GROQ_API_KEY,
        vercel: !!process.env.VERCEL_TOKEN,
        github: !!process.env.GITHUB_TOKEN,
        redis: !!process.env.UPSTASH_REDIS_REST_URL,
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
