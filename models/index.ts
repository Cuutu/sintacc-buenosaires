export { User, type IUser } from "./User"
export { Place, type IPlace } from "./Place"
export { Review, type IReview } from "./Review"
export { ContaminationReport, type IContaminationReport } from "./ContaminationReport"
export { Suggestion, type ISuggestion } from "./Suggestion"
export { RateLimit, type IRateLimit } from "./RateLimit"
export { Favorite, type IFavorite } from "./Favorite"
export { Contact, type IContact } from "./Contact"

// Fase 2 models (scaffolded)
import mongoose from "mongoose"

export interface IReport {
  userId: mongoose.Types.ObjectId
  targetType: "review" | "place" | "photo"
  targetId: mongoose.Types.ObjectId
  reason: string
  status: "pending" | "resolved" | "dismissed"
  createdAt: Date
}

// Fase 3 models (scaffolded)
export interface IPointsEvent {
  userId: mongoose.Types.ObjectId
  type: string
  points: number
  createdAt: Date
}

export interface IBadge {
  userId: mongoose.Types.ObjectId
  type: string
  earnedAt: Date
}
