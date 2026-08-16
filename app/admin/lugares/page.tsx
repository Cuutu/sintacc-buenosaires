import { Suspense } from "react"
import Link from "next/link"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"
import { adminUi } from "@/lib/admin-ui"

export default async function AdminLugaresPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Lugares"
        subtitle="Filtrá huecos, completá fichas y publicá lo que falta."
        counts={counts}
        defaultSection="places"
        tabs={[
          { id: "places", label: "Catálogo" },
          { id: "suggestions", label: "Cola", query: "cola=1" },
        ]}
        actions={
          <>
            <Link href="/sugerir" className={adminUi.btnPrimary}>
              Agregar lugar
            </Link>
            <Link href="/admin/lugares?google=1" className={adminUi.btnGhost}>
              Importar Google
            </Link>
          </>
        }
      />
    </Suspense>
  )
}
