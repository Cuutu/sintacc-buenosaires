import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { Contact } from "@/models/Contact"
import { isAdminEstado } from "@/lib/admin-estado"
import { invalidateApiCache } from "@/lib/api-cache"
import { logApiError } from "@/lib/logger"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    const { estado } = await request.json()
    if (!isAdminEstado(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    await connectDB()
    const contact = await Contact.findByIdAndUpdate(params.id, { $set: { estado } }, { new: true, runValidators: true })
    if (!contact) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 })
    invalidateApiCache(["admin:counts"])
    return NextResponse.json({ contact })
  } catch (error) {
    logApiError("/api/admin/contacts/[id]", error, { request })
    return NextResponse.json({ error: "Error al actualizar mensaje" }, { status: 500 })
  }
}
