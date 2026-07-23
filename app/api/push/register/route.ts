import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import connectDB from "@/lib/mongodb"
import { PushToken } from "@/models/PushToken"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

const bodySchema = z.object({
  token: z.string().min(10).max(512),
  platform: z.enum(["ios", "android", "web"]),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    await connectDB()

    const userId = session?.user?.id
      ? new mongoose.Types.ObjectId(session.user.id)
      : undefined

    await PushToken.findOneAndUpdate(
      { token: parsed.data.token },
      {
        token: parsed.data.token,
        platform: parsed.data.platform,
        ...(userId ? { userId } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    logApiError("/api/push/register", error, { request })
    return NextResponse.json({ error: "Error al registrar token" }, { status: 500 })
  }
}
