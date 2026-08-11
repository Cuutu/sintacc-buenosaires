import mongoose, { Schema, Document, Model } from "mongoose"

/** One-time Apple Sign-In challenge (raw nonce stored; JWT carries SHA-256 hex). */
export interface INativeAppleChallenge extends Document {
  challengeId: string
  /** Cryptographically random raw nonce passed to Capgo → hashed before ASAuthorization. */
  nonceRaw: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const NativeAppleChallengeSchema = new Schema<INativeAppleChallenge>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    nonceRaw: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NativeAppleChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const NativeAppleChallenge: Model<INativeAppleChallenge> =
  mongoose.models.NativeAppleChallenge ||
  mongoose.model<INativeAppleChallenge>(
    "NativeAppleChallenge",
    NativeAppleChallengeSchema
  )
