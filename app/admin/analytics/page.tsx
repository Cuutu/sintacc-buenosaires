import { getAdminCounts } from "@/lib/admin-ops"
import { InsightsWorkspace } from "@/components/admin/insights/InsightsWorkspace"

export default async function AdminAnalyticsPage() {
  const counts = await getAdminCounts()
  return <InsightsWorkspace catalog={counts} />
}
