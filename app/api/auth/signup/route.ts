import { NextRequest, NextResponse } from "next/server"
import { SignupRequest } from "@/types/auth"
import { createToken, hashPassword } from "@/lib/server/authUtils"
import { findUserByEmail, saveUser } from "@/lib/server/userStore"

export async function POST(req: NextRequest) {
  let body: SignupRequest
  try {
    body = (await req.json()) as SignupRequest
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password?.trim()
  const name = body.name?.trim()

  if (!email || !password || !name) {
    return NextResponse.json({ message: "이메일, 비밀번호, 이름을 모두 입력해주세요." }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "비밀번호는 최소 8자 이상이어야 합니다." }, { status: 400 })
  }

  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    return NextResponse.json({ message: "이미 가입된 이메일입니다." }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await saveUser({
    email,
    name,
    passwordHash,
  })

  const token = createToken(user.id)

  return NextResponse.json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    { status: 201 }
  )
}
