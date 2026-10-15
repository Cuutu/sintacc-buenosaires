import mongoose, { Schema, Document, Model } from "mongoose"

/** Tarjeta de un cliente. serialNumber va en el QR; authToken sólo lo conoce el Wallet. */
export interface ILoyaltyCard extends Document {
  programId: mongoose.Types.ObjectId
  serialNumber: string
  authToken: string
  /** Sellos del ciclo actual (vuelve a 0 al canjear). */
  stamps: number
  totalStamps: number
  rewardsRedeemed: number
  lastStampAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LoyaltyCardSchema = new Schema<ILoyaltyCard>(
  {
    programId: { type: Schema.Types.ObjectId, ref: "LoyaltyProgram", required: true, index: true },
    serialNumber: { type: String, required: true, unique: true },
    authToken: { type: String, required: true },
    stamps: { type: Number, default: 0, min: 0 },
    totalStamps: { type: Number, default: 0, min: 0 },
    rewardsRedeemed: { type: Number, default: 0, min: 0 },
    lastStampAt: Date,
  },
  { timestamps: true }
)

export const LoyaltyCard: Model<ILoyaltyCard> =
  mongoose.models.LoyaltyCard || mongoose.model<ILoyaltyCard>("LoyaltyCard", LoyaltyCardSchema)
