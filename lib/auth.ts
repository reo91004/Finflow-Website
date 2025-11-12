import type { LoginRequest, SignupRequest, AuthResponse, User } from "@/types/auth"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "로그인에 실패했습니다.")
  }

  return response.json()
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const response = await fetch(buildUrl("/auth/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "회원가입에 실패했습니다.")
  }

  return response.json()
}

export async function logout(): Promise<void> {
  // 로컬 스토리지에서 토큰 제거
  if (typeof window !== "undefined") {
    localStorage.removeItem("token")
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === "undefined") {
    return null
  }

  const token = localStorage.getItem("token")
  if (!token) {
    return null
  }

  try {
    const response = await fetch(buildUrl("/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      localStorage.removeItem("token")
      return null
    }

    return response.json()
  } catch (error) {
    localStorage.removeItem("token")
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  return localStorage.getItem("token")
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token)
  }
}
