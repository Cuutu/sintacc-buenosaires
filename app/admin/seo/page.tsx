import { getAdminSeoSnapshot } from "@/lib/admin-seo"
import { AdminPageHeader } from "@/components/admin/ui/page-header"
import { AdminSeoCoverage } from "@/components/admin/AdminSeoCoverage"

export default async function AdminSeoPage() {
  const snapshot = await getAdminSeoSnapshot()

  return (
    <div className="mx-auto max-w-[1280px]">
      <AdminPageHeader
        title="SEO"
        description="Cobertura e indexación de las páginas públicas. La calidad de cada ficha se trabaja en Lugares."
      />
      <AdminSeoCoverage ready={snapshot.ready} pending={snapshot.pending} />
    </div>
  )
}
