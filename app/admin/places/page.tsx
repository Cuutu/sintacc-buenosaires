import { redirect } from "next/navigation"

type Search = Record<string, string | string[] | undefined>

const MISSING_MAP: Record<string, string> = {
  instagram: "instagram",
  hours: "hours",
  photo: "photo",
  coords: "coords",
  phone: "phone",
  web: "web",
  description: "description",
  incomplete: "incomplete",
}

export default function AdminPlacesAliasPage({
  searchParams,
}: {
  searchParams: Search
}) {
  const next = new URLSearchParams()
  const missing = typeof searchParams.missing === "string" ? searchParams.missing : ""
  if (missing && MISSING_MAP[missing]) next.set("missing", MISSING_MAP[missing])
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "missing" || value == null) continue
    next.set(key, Array.isArray(value) ? value[0] : value)
  }
  const qs = next.toString()
  redirect(qs ? `/admin/lugares?${qs}` : "/admin/lugares")
}
