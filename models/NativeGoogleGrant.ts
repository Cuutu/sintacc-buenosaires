import mongoose, { Schema, Document, Model } from "mongoose"

export interface INativeGoogleGrant extends Document {
  code: string
  userId: mongoose.Types.ObjectId
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const NativeGoogleGrantSchema = new Schema<INativeGoogleGrant>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NativeGoogleGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const NativeGoogleGrant: Model<INativeGoogleGrant> =
  mongoose.models.NativeGoogleGrant ||
  mongoose.model<INativeGoogleGrant>("NativeGoogleGrant", NativeGoogleGrantSchema)
