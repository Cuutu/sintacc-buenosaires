import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminConfigPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage title="Configuración" counts={counts} defaultSection="social" tabs={[]} />
    </Suspense>
  )
}
