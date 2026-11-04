import mongoose, { Schema, Document, Model } from "mongoose"

/** Último aviso que el local mandó a sus clientes (va al dorso de la tarjeta). */
export type LoyaltyNotice = { text: string; sentAt: Date; byEmail: string }

/** Sello doble: días (0 = domingo) y franja horaria [desde, hasta) en hora de Argentina. */
export type DoubleStampWindow = { days: number[]; fromHour: number; toHour: number }

/** Otra sucursal de la misma marca. Sus mails sólo suman sellos en esa sucursal. */
export type LoyaltyBranch = { placeId: mongoose.Types.ObjectId; staffEmails: string[] }

/**
 * Programa de sellos de un local o de una marca con sucursales (una tarjeta de Wallet por
 * cliente, que vale en todas).
 */
export interface ILoyaltyProgram extends Document {
  /** Local principal (la ficha a la que lleva la tarjeta). */
  placeId: mongoose.Types.ObjectId
  /** Nombre en la tarjeta si hay sucursales ("Polvorín"); si no, el del local. */
  brandName?: string
  /** Las otras sucursales (el local principal no va acá). */
  branches: LoyaltyBranch[]
  stampsForReward: number
  reward: string
  /**
   * Encargados (mails en minúscula): suman sellos en cualquier sucursal, mandan avisos y arman
   * promos desde /local.
   */
  staffEmails: string[]
  /** Empleados del local principal: sólo suman sellos (no mandan avisos ni cambian promos o premio). */
  employeeEmails: string[]
  active: boolean
  notice?: LoyaltyNotice
  doubleStamp?: DoubleStampWindow
  /** "Traé un amigo": cuando el invitado suma su primer sello, ganan uno de regalo los dos. */
  referralEnabled: boolean
  /** Último cambio de sellos o premio (local o admin): la tarjeta lo cuenta como novedad. */
  rewardChangedAt?: Date
  /** Último cambio hecho por el local desde /local (puede cambiarlo una vez cada 15 días). */
  shopRewardChangedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LoyaltyProgramSchema = new Schema<ILoyaltyProgram>(
  {
    placeId: { type: Schema.Types.ObjectId, ref: "Place", required: true, index: true },
    brandName: { type: String, trim: true, maxlength: 60 },
    branches: {
      type: [
        new Schema<LoyaltyBranch>(
          {
            placeId: { type: Schema.Types.ObjectId, ref: "Place", required: true },
            staffEmails: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    stampsForReward: { type: Number, required: true, min: 1, max: 20 },
    reward: { type: String, required: true, trim: true, maxlength: 80 },
    staffEmails: { type: [String], default: [], index: true },
    employeeEmails: { type: [String], default: [], index: true },
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
    referralEnabled: { type: Boolean, default: false },
    rewardChangedAt: Date,
    shopRewardChangedAt: Date,
  },
  { timestamps: true }
)

// Panel /local del personal de una sucursal, y "este lugar ya tiene tarjeta".
LoyaltyProgramSchema.index({ "branches.staffEmails": 1 })
LoyaltyProgramSchema.index({ "branches.placeId": 1 })

export const LoyaltyProgram: Model<ILoyaltyProgram> =
  mongoose.models.LoyaltyProgram ||
  mongoose.model<ILoyaltyProgram>("LoyaltyProgram", LoyaltyProgramSchema)
