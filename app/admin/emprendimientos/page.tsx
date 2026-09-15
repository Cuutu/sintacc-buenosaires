import { Suspense } from "react"
import Link from "next/link"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"
import { adminUi } from "@/lib/admin-ui"

export default async function AdminEmprendimientosPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Emprendimientos"
        counts={counts}
        defaultSection="ventures"
        tabs={[
          { id: "ventures", label: "Publicadas" },
          { id: "ventureSuggestions", label: "Cola", query: "cola=1" },
        ]}
        actions={
          <Link href="/sugerir-emprendimiento" className={adminUi.btnPrimary}>
            Publicar emprendimiento
          </Link>
        }
      />
    </Suspense>
  )
}
