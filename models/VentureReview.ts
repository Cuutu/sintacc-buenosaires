import mongoose, { Schema, Document, Model } from "mongoose"

export interface IVentureReview extends Document {
  ventureId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  rating: number
  comment: string
  status: "visible" | "hidden"
  pinned?: boolean
  createdAt: Date
  updatedAt: Date
}

const VentureReviewSchema = new Schema<IVentureReview>(
  {
    ventureId: {
      type: Schema.Types.ObjectId,
      ref: "Venture",
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
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

VentureReviewSchema.index({ ventureId: 1, status: 1, createdAt: -1 })
VentureReviewSchema.index({ userId: 1, ventureId: 1 })

export const VentureReview: Model<IVentureReview> =
  mongoose.models.VentureReview ||
  mongoose.model<IVentureReview>("VentureReview", VentureReviewSchema)
