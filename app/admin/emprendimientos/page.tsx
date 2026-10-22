import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminEmprendimientosPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Emprendimientos"
        counts={counts}
        defaultSection="ventures"
        tabs={[
          { id: "ventures", label: "Catálogo" },
          { id: "ventureSuggestions", label: "Cola", query: "cola=1", count: counts.ventureSuggestionsPending },
        ]}
      />
    </Suspense>
  )
}
