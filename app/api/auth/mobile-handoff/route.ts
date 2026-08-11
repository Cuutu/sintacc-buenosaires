import { NextResponse } from "next/server"
import crypto from "crypto"
import type { NextRequest } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import connectDB from "@/lib/mongodb"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"

const HANDOFF_TTL_MS = 120_000

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const body = await request.json().catch(() => ({}))
  const nextPath = sanitizeReturnTo((body as { next?: unknown }).next)

  await connectDB()

  const code = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS)

  await MobileAuthHandoff.create({
    code,
    userId: session.user.id,
    nextPath,
    expiresAt,
    used: false,
  })

  return NextResponse.json({ code })
}
