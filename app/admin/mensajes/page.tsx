import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminMensajesPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Mensajes"
        subtitle="Bandeja de contacto. Lo pendiente aparece primero en el centro de operaciones."
        counts={counts}
        defaultSection="contacts"
        tabs={[]}
      />
    </Suspense>
  )
}
