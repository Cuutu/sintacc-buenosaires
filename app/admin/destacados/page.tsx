import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminDestacadosPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage title="Destacados" counts={counts} defaultSection="featured" tabs={[]} />
    </Suspense>
  )
}
