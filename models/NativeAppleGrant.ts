import mongoose, { Schema, Document, Model } from "mongoose"

export interface INativeAppleGrant extends Document {
  code: string
  userId: mongoose.Types.ObjectId
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const NativeAppleGrantSchema = new Schema<INativeAppleGrant>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NativeAppleGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const NativeAppleGrant: Model<INativeAppleGrant> =
  mongoose.models.NativeAppleGrant ||
  mongoose.model<INativeAppleGrant>("NativeAppleGrant", NativeAppleGrantSchema)
