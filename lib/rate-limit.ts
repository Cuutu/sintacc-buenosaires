import { NextRequest } from "next/server"
import connectDB from "@/lib/mongodb"
import { RateLimit } from "@/models/RateLimit"
import { RateLimitIp } from "@/models/RateLimitIp"
import mongoose from "mongoose"

/**
 * Extrae IP del request. Orden: x-forwarded-for (primer IP, cliente original) →
 * x-real-ip → x-vercel-forwarded-for → cf-connecting-ip → unknown
 * Vercel y proxies estándar usan x-forwarded-for con el cliente a la izquierda.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const vercelFwd = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (vercelFwd) return vercelFwd.split(",")[0]?.trim() || vercelFwd
  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) return cfIp
  return "unknown"
}

/** Límite por usuario (requiere auth) */
export async function checkRateLimit(
  userId: string,
  type: string,
  maxCount: number
): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rateLimit = await RateLimit.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      type,
      date: today,
    },
    { $inc: { count: 1 } },
    {
      upsert: true,
      new: true,
    }
  )

  const remaining = Math.max(0, maxCount - rateLimit.count)

  return {
    allowed: rateLimit.count <= maxCount,
    remaining,
  }
}

/** Límite por IP (para stats y capa extra en contact/suggestions). windowMinutes: 1440=24h, 15=15min */
export async function checkRateLimitByIp(
  request: NextRequest,
  type: string,
  maxCount: number,
  windowMinutes: number = 1440
): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB()

  const ip = getClientIp(request)
  const now = new Date()
  let windowStart: Date
  if (windowMinutes >= 1440) {
    windowStart = new Date(now)
    windowStart.setHours(0, 0, 0, 0)
  } else {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const minsFromMidnight = (now.getTime() - startOfDay.getTime()) / 60000
    const bucket = Math.floor(minsFromMidnight / windowMinutes) * windowMinutes
    windowStart = new Date(startOfDay.getTime() + bucket * 60000)
  }

  const rateLimit = await RateLimitIp.findOneAndUpdate(
    { ip, type, windowStart },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  )

  const remaining = Math.max(0, maxCount - rateLimit.count)

  return {
    allowed: rateLimit.count <= maxCount,
    remaining,
  }
}
