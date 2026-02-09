import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    )
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
