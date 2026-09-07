import { getAdminCounts, EMPTY_ADMIN_COUNTS } from "@/lib/admin-ops"
import { InsightsWorkspace } from "@/components/admin/insights/InsightsWorkspace"

export default async function AdminAnalyticsPage() {
  let catalog = EMPTY_ADMIN_COUNTS
  try {
    catalog = await getAdminCounts()
  } catch {
    /* Insights igual monta. Catálogo vacío si Mongo falla. */
  }
  return <InsightsWorkspace catalog={catalog} />
}
