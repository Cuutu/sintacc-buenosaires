import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"

const CRITICAL_ENV = [
  "MONGODB_URI",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, boolean> = {}
  let healthy = true

  for (const key of CRITICAL_ENV) {
    checks[`env_${key}`] = !!process.env[key]
    if (!process.env[key]) healthy = false
  }

  try {
    await connectDB()
    checks.db = true
  } catch (error) {
    checks.db = false
    healthy = false
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
