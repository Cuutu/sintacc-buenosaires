import mongoose, { Schema, Document, Model } from "mongoose"

/** Registro de cada sello o canje: es la métrica que se le muestra al local. */
export interface ILoyaltyStamp extends Document {
  programId: mongoose.Types.ObjectId
  cardId: mongoose.Types.ObjectId
  kind: "stamp" | "redeem"
  /** Sellos que sumó esa visita (2 con sello doble). */
  count: number
  bonus?: "double"
  byEmail: string
  createdAt: Date
}

const LoyaltyStampSchema = new Schema<ILoyaltyStamp>(
  {
    programId: { type: Schema.Types.ObjectId, ref: "LoyaltyProgram", required: true },
    cardId: { type: Schema.Types.ObjectId, ref: "LoyaltyCard", required: true },
    kind: { type: String, enum: ["stamp", "redeem"], required: true },
    count: { type: Number, default: 1, min: 1 },
    bonus: { type: String, enum: ["double"] },
    byEmail: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

LoyaltyStampSchema.index({ programId: 1, createdAt: -1 })

export const LoyaltyStamp: Model<ILoyaltyStamp> =
  mongoose.models.LoyaltyStamp || mongoose.model<ILoyaltyStamp>("LoyaltyStamp", LoyaltyStampSchema)
