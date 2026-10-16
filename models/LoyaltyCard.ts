import mongoose, { Schema, Document, Model } from "mongoose"

export const LOYALTY_WALLETS = ["apple", "google"] as const
export type LoyaltyWallet = (typeof LOYALTY_WALLETS)[number]

/** Por qué el último sello sumó más de uno (para el mensaje de la tarjeta). */
export const STAMP_REASONS = ["double", "friend", "inviter"] as const
export type StampReasonValue = (typeof STAMP_REASONS)[number]

/** Tarjeta de un cliente. serialNumber va en el QR; authToken sólo lo conoce el Wallet. */
export interface ILoyaltyCard extends Document {
  programId: mongoose.Types.ObjectId
  serialNumber: string
  authToken: string
  /** Dónde la guardó el cliente (las de antes de Google Wallet no lo tienen: son de Apple). */
  wallet?: LoyaltyWallet
  /** Sellos del ciclo actual (vuelve a 0 al canjear). */
  stamps: number
  totalStamps: number
  /** Veces que el local le sumó sellos (con sello doble, una visita suma 2 sellos). */
  visits?: number
  rewardsRedeemed: number
  lastStampAt?: Date
  /** Cuántos sellos sumó la última vez y por qué (sello doble…). */
  lastStampAdded?: number
  lastStampReason?: StampReasonValue
  /**
   * Código del botón "Agregar" que la creó: si llegan dos pedidos con el mismo código (doble
   * toque, o el celu que reintenta), es la misma tarjeta.
   */
  requestKey?: string
  /** Tarjeta del amigo que lo invitó ("Traé un amigo"). */
  referredBy?: mongoose.Types.ObjectId
  /** Cuándo se entregaron los sellos de regalo por venir invitado (una sola vez). */
  referralRewardedAt?: Date
  /** Sellos de regalo que ganó por amigos que invitó (tiene un tope). */
  referralsRewarded: number
  createdAt: Date
  updatedAt: Date
}

const LoyaltyCardSchema = new Schema<ILoyaltyCard>(
  {
    programId: { type: Schema.Types.ObjectId, ref: "LoyaltyProgram", required: true, index: true },
    serialNumber: { type: String, required: true, unique: true },
    authToken: { type: String, required: true },
    wallet: { type: String, enum: LOYALTY_WALLETS, default: "apple" },
    stamps: { type: Number, default: 0, min: 0 },
    totalStamps: { type: Number, default: 0, min: 0 },
    visits: { type: Number, min: 0 },
    rewardsRedeemed: { type: Number, default: 0, min: 0 },
    lastStampAt: Date,
    lastStampAdded: { type: Number, min: 0 },
    lastStampReason: { type: String, enum: STAMP_REASONS },
    requestKey: { type: String },
    referredBy: { type: Schema.Types.ObjectId, ref: "LoyaltyCard" },
    referralRewardedAt: Date,
    referralsRewarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

// Una tarjeta por botón tocado: un doble toque no crea dos.
LoyaltyCardSchema.index(
  { programId: 1, requestKey: 1 },
  { unique: true, partialFilterExpression: { requestKey: { $type: "string" } } }
)

export const LoyaltyCard: Model<ILoyaltyCard> =
  mongoose.models.LoyaltyCard || mongoose.model<ILoyaltyCard>("LoyaltyCard", LoyaltyCardSchema)
