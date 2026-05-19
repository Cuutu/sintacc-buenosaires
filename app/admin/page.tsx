import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAdminCounts } from "@/lib/admin-data"
import { AdminDashboard } from "@/components/admin/AdminDashboard"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    redirect("/login?callbackUrl=/admin")
  }

  const initialCounts = await getAdminCounts()

  return <AdminDashboard initialCounts={initialCounts} />
}
