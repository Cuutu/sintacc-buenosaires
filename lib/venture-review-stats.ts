import mongoose from "mongoose"
import { VentureReview } from "@/models/VentureReview"

export type VentureReviewStats = {
  avgRating: number
  totalReviews: number
}

export async function getVentureReviewStatsMap(
  ventureIds: mongoose.Types.ObjectId[]
): Promise<Map<string, VentureReviewStats>> {
  const map = new Map<string, VentureReviewStats>()
  if (!ventureIds.length) return map

  const rows = await VentureReview.aggregate([
    { $match: { ventureId: { $in: ventureIds }, status: "visible" } },
    {
      $group: {
        _id: "$ventureId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ])

  for (const row of rows) {
    map.set(row._id.toString(), {
      avgRating: Math.round(row.avgRating * 10) / 10,
      totalReviews: row.totalReviews,
    })
  }

  return map
}

export async function getSingleVentureReviewStats(
  ventureId: mongoose.Types.ObjectId
): Promise<VentureReviewStats> {
  const map = await getVentureReviewStatsMap([ventureId])
  return map.get(ventureId.toString()) ?? { avgRating: 0, totalReviews: 0 }
}
