import { NextRequest, NextResponse } from "next/server"
import { getUserById } from "@/lib/server/userStore"
import { verifyToken } from "@/lib/server/authUtils"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: "인증 토큰이 필요합니다." }, { status: 401 })
  }

  const token = authHeader.slice("Bearer ".length).trim()
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ message: "유효하지 않은 토큰입니다." }, { status: 401 })
  }

  const user = await getUserById(payload.sub)
  if (!user) {
    return NextResponse.json({ message: "사용자를 찾을 수 없습니다." }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  })
}
