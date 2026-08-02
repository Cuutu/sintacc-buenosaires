import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import crypto from "crypto"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"

function sanitizeNextPath(next: unknown): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next
  }
  return "/perfil"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const nextPath = sanitizeNextPath(body.next)

  await connectDB()

  const code = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await MobileAuthHandoff.create({
    code,
    userId: session.user.id,
    nextPath,
    expiresAt,
    used: false,
  })

  return NextResponse.json({ code })
}
