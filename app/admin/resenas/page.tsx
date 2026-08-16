import { Suspense } from "react"
import { getAdminCounts } from "@/lib/admin-ops"
import { AdminModulePage } from "@/components/admin/ops/AdminModulePage"

export default async function AdminResenasPage() {
  const counts = await getAdminCounts()
  return (
    <Suspense>
      <AdminModulePage
        title="Reseñas"
        subtitle="Moderá reseñas de lugares y marcas. Las reportadas pesan más si llevan días."
        counts={counts}
        defaultSection="reviews"
        tabs={[
          { id: "reviews", label: "Lugares" },
          { id: "ventureReviews", label: "Marcas" },
        ]}
      />
    </Suspense>
  )
}
