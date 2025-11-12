import { NextRequest, NextResponse } from "next/server"
import { LoginRequest } from "@/types/auth"
import { createToken, verifyPassword } from "@/lib/server/authUtils"
import { findUserByEmail } from "@/lib/server/userStore"

export async function POST(req: NextRequest) {
  let body: LoginRequest
  try {
    body = (await req.json()) as LoginRequest
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password?.trim()

  if (!email || !password) {
    return NextResponse.json({ message: "이메일과 비밀번호를 모두 입력해주세요." }, { status: 400 })
  }

  const user = await findUserByEmail(email)
  if (!user) {
    return NextResponse.json({ message: "등록되지 않은 이메일입니다." }, { status: 401 })
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    return NextResponse.json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 })
  }

  const token = createToken(user.id)

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
}
