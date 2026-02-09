import connectDB from "@/lib/mongodb"
import { RateLimit } from "@/models/RateLimit"
import mongoose from "mongoose"

export async function checkRateLimit(
  userId: string,
  type: string,
  maxCount: number
): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const rateLimit = await RateLimit.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      type,
      date: today,
    },
    { $inc: { count: 1 } },
    {
      upsert: true,
      new: true,
    }
  )
  
  const remaining = Math.max(0, maxCount - rateLimit.count)
  
  return {
    allowed: rateLimit.count <= maxCount,
    remaining,
  }
}
