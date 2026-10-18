import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import connectDB from "@/lib/mongodb"
import { User } from "@/models/User"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"

/**
 * Redirect con Location relativa ("/perfil"), que el navegador resuelve contra el dominio real.
 * No usar new URL(path, request.url): en el servidor propio (next start detrás de Caddy) Next arma
 * request.url con su puerto local (https://localhost:3000/…), y la app de Android abría Chrome
 * en localhost:3000/perfil después de iniciar sesión.
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const nextParam = request.nextUrl.searchParams.get("next")

  if (!code) {
    return redirectTo("/login")
  }

  await connectDB()

  const handoff = await MobileAuthHandoff.findOne({
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  })

  if (!handoff) {
    return redirectTo("/login?error=handoff")
  }

  handoff.used = true
  await handoff.save()

  const user = await User.findById(handoff.userId)
  if (!user) {
    return redirectTo("/login")
  }

  const token = await encode({
    token: {
      sub: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role,
    },
    secret: authOptions.secret ?? process.env.NEXTAUTH_SECRET!,
    maxAge: authOptions.session?.maxAge ?? 30 * 24 * 60 * 60,
  })

  const secure = process.env.NODE_ENV === "production"
  const cookieName = secure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"

  const redirectPath = sanitizeReturnTo(nextParam ?? handoff.nextPath)
  const response = redirectTo(redirectPath)

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: authOptions.session?.maxAge ?? 30 * 24 * 60 * 60,
  })

  return response
}
