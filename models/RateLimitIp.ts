import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRateLimitIp extends Document {
  ip: string
  type: string
  windowStart: Date
  count: number
  createdAt: Date
  updatedAt: Date
}

const RateLimitIpSchema = new Schema<IRateLimitIp>(
  {
    ip: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

RateLimitIpSchema.index({ ip: 1, type: 1, windowStart: 1 }, { unique: true })
RateLimitIpSchema.index({ windowStart: 1 }, { expireAfterSeconds: 86400 * 8 })

export const RateLimitIp: Model<IRateLimitIp> =
  mongoose.models.RateLimitIp ||
  mongoose.model<IRateLimitIp>("RateLimitIp", RateLimitIpSchema)
