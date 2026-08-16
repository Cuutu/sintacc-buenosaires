import { getAdminOpsSnapshot } from "@/lib/admin-ops"
import { OpsDashboard } from "@/components/admin/ops/OpsDashboard"

export default async function AdminPage() {
  const snapshot = await getAdminOpsSnapshot()
  return <OpsDashboard initial={snapshot} />
}
