import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import crypto from "crypto"
import { authOptions } from "@/lib/auth"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import connectDB from "@/lib/mongodb"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"

const HANDOFF_TTL_MS = 120_000

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
