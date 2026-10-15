import mongoose, { Schema, Document, Model } from "mongoose"

/** Programa de sellos de un local (una tarjeta de Wallet por cliente). */
export interface ILoyaltyProgram extends Document {
  placeId: mongoose.Types.ObjectId
  stampsForReward: number
  reward: string
  /** Mails (en minúscula) que pueden sumar sellos desde /local. */
  staffEmails: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const LoyaltyProgramSchema = new Schema<ILoyaltyProgram>(
  {
    placeId: { type: Schema.Types.ObjectId, ref: "Place", required: true, index: true },
    stampsForReward: { type: Number, required: true, min: 1, max: 20 },
    reward: { type: String, required: true, trim: true, maxlength: 80 },
    staffEmails: { type: [String], default: [], index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const LoyaltyProgram: Model<ILoyaltyProgram> =
  mongoose.models.LoyaltyProgram ||
  mongoose.model<ILoyaltyProgram>("LoyaltyProgram", LoyaltyProgramSchema)
