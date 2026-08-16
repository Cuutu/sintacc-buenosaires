import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminOpsShell } from "@/components/admin/ops/AdminOpsShell"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    redirect("/login?callbackUrl=/admin")
  }

  const counts = await getAdminCounts()

  return <AdminOpsShell initialCounts={counts}>{children}</AdminOpsShell>
}
