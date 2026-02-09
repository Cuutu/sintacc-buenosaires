import mongoose, { Schema, Document, Model } from "mongoose"
import { features } from "@/lib/features"

export interface IReview extends Document {
  placeId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  rating: number
  safeFeeling: boolean
  separateKitchen: "yes" | "no" | "unknown"
  comment: string
  status: "visible" | "hidden"
  // Fase 2
  contaminationIncident?: boolean
  visitDate?: Date
  evidencePhotos?: string[]
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    safeFeeling: {
      type: Boolean,
      required: true,
    },
    separateKitchen: {
      type: String,
      enum: ["yes", "no", "unknown"],
      required: true,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 800,
      trim: true,
    },
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
    // Fase 2
    contaminationIncident: {
      type: Boolean,
    },
    visitDate: {
      type: Date,
    },
    evidencePhotos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

ReviewSchema.index({ placeId: 1, status: 1 })
ReviewSchema.index({ userId: 1, createdAt: -1 })

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema)
