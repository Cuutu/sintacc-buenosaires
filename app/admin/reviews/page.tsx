import { redirect } from "next/navigation"

export default function AdminReviewsAliasPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const status = typeof searchParams.status === "string" ? searchParams.status : ""
  redirect(status ? `/admin/resenas?status=${encodeURIComponent(status)}` : "/admin/resenas")
}
