import { AdminLoyaltySection } from "@/components/admin/AdminLoyaltySection"
import { listProgramsForAdmin } from "@/lib/wallet/loyalty-admin"

export const dynamic = "force-dynamic"

export default async function AdminTarjetasPage() {
  const programs = await listProgramsForAdmin()
  return <AdminLoyaltySection initialPrograms={programs} />
}
