import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import connectDB from "@/lib/mongodb"
import { User } from "@/models/User"
import mongoose from "mongoose"
/**
 * Authority for protected APIs: session + User still exists.
 * One Mongo existence lookup per protected request (JWT callback does not re-query).
 */
export async function requireAuth(_request?: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    await connectDB()
    const exists = await User.exists({ _id: session.user.id })
    if (!exists) {
      return NextResponse.json(
        { error: "No autorizado", code: "account_deleted" },
        { status: 401 }
      )
    }
  } catch {
    // DB outage: do not lock out all users; session still required above.
  }

  return session
}

export async function requireAdmin(request: NextRequest) {
  const session = await requireAuth(request)

  if (session instanceof NextResponse) {
    return session
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere rol de administrador." },
      { status: 403 }
    )
  }

  return session
}

/**
 * Optional session for public reads. If a user id is present, verify it still exists;
 * otherwise treat as anonymous (do not trust deleted JWTs for ownership).
 */
export async function getOptionalActiveSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  if (!mongoose.Types.ObjectId.isValid(session.user.id)) return null
  try {
    await connectDB()
    const exists = await User.exists({ _id: session.user.id })
    if (!exists) return null
  } catch {
    return session
  }
  return session
}
