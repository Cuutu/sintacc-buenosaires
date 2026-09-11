import { NextRequest } from "next/server"
import connectDB from "@/lib/mongodb"
import { RateLimit } from "@/models/RateLimit"
import { RateLimitIp } from "@/models/RateLimitIp"
import mongoose from "mongoose"

function firstIp(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim()
  return first || null
}

/**
 * IP para rate limit. En Vercel el header de plataforma es `x-vercel-forwarded-for`
 * (el cliente no lo puede pisar). `x-forwarded-for` queda último: en Vercel lo
 * sobreescriben ellos, pero un caller directo podría mandarlo.
 */
export function getClientIp(request: NextRequest): string {
  const vercelFwd = firstIp(request.headers.get("x-vercel-forwarded-for"))
  if (vercelFwd) return vercelFwd
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const forwarded = firstIp(request.headers.get("x-forwarded-for"))
  if (forwarded) return forwarded
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

export type RateLimitByIpResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

function windowStartFor(now: Date, windowMinutes: number): Date {
  if (windowMinutes >= 1440) {
    const windowStart = new Date(now)
    windowStart.setHours(0, 0, 0, 0)
    return windowStart
  }
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const minsFromMidnight = (now.getTime() - startOfDay.getTime()) / 60000
  const bucket = Math.floor(minsFromMidnight / windowMinutes) * windowMinutes
  return new Date(startOfDay.getTime() + bucket * 60000)
}

function retryAfterSeconds(windowStart: Date, windowMinutes: number, now: Date): number {
  const windowEndMs = windowStart.getTime() + windowMinutes * 60 * 1000
  return Math.max(1, Math.ceil((windowEndMs - now.getTime()) / 1000))
}

/** Límite por IP (para stats y capa extra en contact/suggestions). windowMinutes: 1440=24h, 15=15min */
export async function checkRateLimitByIp(
  request: NextRequest,
  type: string,
  maxCount: number,
  windowMinutes: number = 1440
): Promise<RateLimitByIpResult> {
  await connectDB()

  const ip = getClientIp(request)
  const now = new Date()
  const windowStart = windowStartFor(now, windowMinutes)

  const rateLimit = await RateLimitIp.findOneAndUpdate(
    { ip, type, windowStart },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  )

  const remaining = Math.max(0, maxCount - rateLimit.count)

  return {
    allowed: rateLimit.count <= maxCount,
    remaining,
    retryAfterSeconds: retryAfterSeconds(windowStart, windowMinutes, now),
  }
}
