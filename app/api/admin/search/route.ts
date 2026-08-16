import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Venture } from "@/models/Venture"
import { Contact } from "@/models/Contact"
import { Suggestion } from "@/models/Suggestion"
import { Review } from "@/models/Review"
import { User } from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    await connectDB()
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

    const [places, ventures, contacts, suggestions, reviews, users] = await Promise.all([
      Place.find({ $or: [{ name: regex }, { neighborhood: regex }, { address: regex }] })
        .select("name neighborhood slug")
        .limit(5)
        .lean(),
      Venture.find({ $or: [{ name: regex }, { zone: regex }] })
        .select("name zone slug")
        .limit(4)
        .lean(),
      Contact.find({ $or: [{ subject: regex }, { name: regex }, { email: regex }] })
        .select("subject name")
        .limit(3)
        .lean(),
      Suggestion.find({ "placeDraft.name": regex })
        .select("placeDraft.name status")
        .limit(3)
        .lean(),
      Review.find({ comment: regex })
        .select("comment rating")
        .limit(3)
        .lean(),
      User.find({ $or: [{ name: regex }, { email: regex }] })
        .select("name email role")
        .limit(3)
        .lean(),
    ])

    const results = [
      ...places.map((p) => ({
        id: `p-${p._id}`,
        kind: "lugar",
        label: p.name,
        hint: p.neighborhood,
        href: "/admin/lugares",
      })),
      ...ventures.map((v) => ({
        id: `v-${v._id}`,
        kind: "marca",
        label: v.name,
        hint: v.zone,
        href: "/admin/marcas",
      })),
      ...suggestions.map((s) => ({
        id: `s-${s._id}`,
        kind: "sugerencia",
        label: s.placeDraft?.name || "Sugerencia",
        hint: s.status,
        href: "/admin/lugares?cola=1",
      })),
      ...contacts.map((c) => ({
        id: `c-${c._id}`,
        kind: "mensaje",
        label: c.subject,
        hint: c.name,
        href: "/admin/mensajes",
      })),
      ...reviews.map((r) => ({
        id: `r-${r._id}`,
        kind: "reseña",
        label: r.comment?.slice(0, 72) || `${r.rating} ★`,
        hint: "Reseña",
        href: "/admin/resenas",
      })),
      ...users.map((u) => ({
        id: `u-${u._id}`,
        kind: "usuario",
        label: u.name,
        hint: u.email,
        href: "/admin/mensajes",
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    logApiError("/api/admin/search", error, { request })
    return NextResponse.json({ error: "Error al buscar" }, { status: 500 })
  }
}
