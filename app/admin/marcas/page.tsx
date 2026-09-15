import { redirect } from "next/navigation"

export default function AdminAliasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value != null) query.set(key, Array.isArray(value) ? value[0] : value)
  }
  redirect("/admin/emprendimientos" + (query.size ? `?${query}` : ""))
}
