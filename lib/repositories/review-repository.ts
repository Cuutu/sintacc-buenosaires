import connectDB from "@/lib/mongodb"
import { Review, IReview } from "@/models/Review"
import mongoose from "mongoose"

export class ReviewRepository {
  async findByPlaceId(placeId: string, status: "visible" | "hidden" = "visible") {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return []
    }

    return await Review.find({
      placeId: new mongoose.Types.ObjectId(placeId),
      status,
    })
      .populate("userId", "name image")
      .sort({ createdAt: -1 })
      .lean()
  }

  async create(data: Partial<IReview>): Promise<IReview> {
    await connectDB()
    const review = new Review(data)
    await review.save()
    return review.toObject()
  }

  async updateStatus(id: string, status: "visible" | "hidden"): Promise<IReview | null> {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean()

    return review as IReview | null
  }

  async findByUserId(userId: string) {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return []
    }

    return await Review.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean()
  }
}
