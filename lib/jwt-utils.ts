import { SignJWT, jwtVerify } from "jose"

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(process.env.API_SECRET_KEY || "fallback-secret-change-this")
const JWT_ISSUER = "code-homie-platform"
const JWT_AUDIENCE = "code-homie-users"
const JWT_EXPIRY = "24h" // 24 hours

export interface JWTPayload {
  userId: string
  email: string
  role: string
  [key: string]: any
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 60 * 24 // 24 hours

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return payload as JWTPayload
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}
