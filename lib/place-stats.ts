import { cache } from "react"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"

export type PlaceLiveStats = {
  avgRating: number
  totalReviews: number
  safeFeelingCount: number
  contaminationReportsCount: number
}

async function loadPlaceLiveStats(placeId: string): Promise<PlaceLiveStats> {
  await connectDB()
  const placeObjectId = new mongoose.Types.ObjectId(placeId)
  const [reviewStats, contaminationReportsCount] = await Promise.all([
    Review.aggregate([
      { $match: { placeId: placeObjectId, status: "visible" } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          safeFeelingCount: { $sum: { $cond: ["$safeFeeling", 1, 0] } },
        },
      },
    ]),
    ContaminationReport.countDocuments({
      placeId: placeObjectId,
      status: "visible",
    }),
  ])

  const stats = reviewStats[0] || {
    avgRating: 0,
    totalReviews: 0,
    safeFeelingCount: 0,
  }

  return {
    totalReviews: stats.totalReviews,
    avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
    safeFeelingCount: stats.safeFeelingCount,
    contaminationReportsCount,
  }
}

export const getPlaceLiveStats = cache(loadPlaceLiveStats)
