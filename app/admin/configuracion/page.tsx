import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminConfigPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Redes sociales"
        subtitle="Armá el texto y la imagen de una historia o un posteo a partir de los lugares."
        counts={counts}
        defaultSection="social"
        tabs={[]}
      />
    </Suspense>
  )
}
