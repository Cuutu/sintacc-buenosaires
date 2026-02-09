import { Review } from "@/models/Review"
import { Place } from "@/models/Place"
import mongoose from "mongoose"
import { features } from "./features"

export async function calculateCommunityConfidenceScore(
  placeId: string
): Promise<number> {
  if (!features.communityConfidence) {
    return 0
  }

  const reviews = await Review.find({
    placeId: new mongoose.Types.ObjectId(placeId),
    status: "visible",
  }).lean()

  if (reviews.length === 0) {
    return 0
  }

  let score = 0
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  reviews.forEach((review) => {
    // Base score from safeFeeling
    if (review.safeFeeling) {
      score += 10
    }

    // Bonus for recent reviews
    const reviewDate = new Date(review.createdAt)
    if (reviewDate > thirtyDaysAgo) {
      score += 5
    }

    // Penalty for contamination incidents (Fase 2)
    if (review.contaminationIncident) {
      score -= 20
    }
  })

  // Normalize to 0-100
  const maxPossibleScore = reviews.length * 15
  const normalizedScore = Math.max(0, Math.min(100, (score / maxPossibleScore) * 100))

  return Math.round(normalizedScore)
}
