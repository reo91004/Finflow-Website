import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto"

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7 // 7 days
const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me"

interface TokenPayload {
  sub: string
  iat: number
  exp: number
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64url")

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err)
      } else {
        resolve(derivedKey)
      }
    })
  })
  return `${salt.toString("hex")}:${derived.toString("hex")}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":")
  if (!saltHex || !hashHex) {
    return false
  }
  try {
    const salt = Buffer.from(saltHex, "hex")
    const expected = Buffer.from(hashHex, "hex")
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) {
          reject(err)
        } else {
          resolve(derivedKey)
        }
      })
    })
    if (derived.length !== expected.length) {
      return false
    }
    return timingSafeEqual(derived, expected)
  } catch (error) {
    console.error("[authUtils] Password verification failed", error)
    return false
  }
}

export function createToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    sub: userId,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  }

  const headerPart = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadPart = base64url(JSON.stringify(payload))
  const signature = sign(`${headerPart}.${payloadPart}`)

  return `${headerPart}.${payloadPart}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) {
    return null
  }

  const [headerPart, payloadPart, signature] = parts
  const expectedSignature = sign(`${headerPart}.${payloadPart}`)

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as TokenPayload
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch (error) {
    console.error("[authUtils] Failed to parse token payload", error)
    return null
  }
}

function sign(content: string): string {
  return createHmac("sha256", SECRET).update(content).digest("base64url")
}
