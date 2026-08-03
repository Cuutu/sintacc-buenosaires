import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import connectDB from "@/lib/mongodb"
import { User } from "@/models/User"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const nextParam = request.nextUrl.searchParams.get("next")

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  await connectDB()

  const handoff = await MobileAuthHandoff.findOne({
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  })

  if (!handoff) {
    return NextResponse.redirect(new URL("/login?error=handoff", request.url))
  }

  handoff.used = true
  await handoff.save()

  const user = await User.findById(handoff.userId)
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
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
  const response = NextResponse.redirect(new URL(redirectPath, request.url))

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: authOptions.session?.maxAge ?? 30 * 24 * 60 * 60,
  })

  return response
}
