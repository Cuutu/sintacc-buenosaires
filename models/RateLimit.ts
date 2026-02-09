import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRateLimit extends Document {
  userId: mongoose.Types.ObjectId
  type: string
  count: number
  date: Date
  createdAt: Date
  updatedAt: Date
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

RateLimitSchema.index({ userId: 1, type: 1, date: 1 }, { unique: true })

export const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit ||
  mongoose.model<IRateLimit>("RateLimit", RateLimitSchema)
