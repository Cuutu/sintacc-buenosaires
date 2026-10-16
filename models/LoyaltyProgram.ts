import mongoose, { Schema, Document, Model } from "mongoose"

/** Último aviso que el local mandó a sus clientes (va al dorso de la tarjeta). */
export type LoyaltyNotice = { text: string; sentAt: Date; byEmail: string }

/** Sello doble: días (0 = domingo) y franja horaria [desde, hasta) en hora de Argentina. */
export type DoubleStampWindow = { days: number[]; fromHour: number; toHour: number }

/** Programa de sellos de un local (una tarjeta de Wallet por cliente). */
export interface ILoyaltyProgram extends Document {
  placeId: mongoose.Types.ObjectId
  stampsForReward: number
  reward: string
  /** Mails (en minúscula) que pueden sumar sellos desde /local. */
  staffEmails: string[]
  active: boolean
  notice?: LoyaltyNotice
  doubleStamp?: DoubleStampWindow
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
    notice: {
      type: new Schema<LoyaltyNotice>(
        {
          text: { type: String, required: true, maxlength: 140 },
          sentAt: { type: Date, required: true },
          byEmail: { type: String, required: true },
        },
        { _id: false }
      ),
      required: false,
    },
    doubleStamp: {
      type: new Schema<DoubleStampWindow>(
        {
          days: { type: [Number], required: true },
          fromHour: { type: Number, required: true, min: 0, max: 23 },
          toHour: { type: Number, required: true, min: 1, max: 24 },
        },
        { _id: false }
      ),
      required: false,
    },
  },
  { timestamps: true }
)

export const LoyaltyProgram: Model<ILoyaltyProgram> =
  mongoose.models.LoyaltyProgram ||
  mongoose.model<ILoyaltyProgram>("LoyaltyProgram", LoyaltyProgramSchema)
