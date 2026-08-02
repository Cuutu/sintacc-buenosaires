import mongoose, { Schema, Document, Model } from "mongoose"

export interface IMobileAuthHandoff extends Document {
  code: string
  userId: mongoose.Types.ObjectId
  nextPath: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const MobileAuthHandoffSchema = new Schema<IMobileAuthHandoff>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nextPath: { type: String, required: true, default: "/perfil" },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

MobileAuthHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const MobileAuthHandoff: Model<IMobileAuthHandoff> =
  mongoose.models.MobileAuthHandoff ||
  mongoose.model<IMobileAuthHandoff>("MobileAuthHandoff", MobileAuthHandoffSchema)
