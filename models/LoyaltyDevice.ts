import mongoose, { Schema, Document, Model } from "mongoose"

/** iPhones que tienen una tarjeta guardada (servicio web de Apple Wallet). */
export interface ILoyaltyDevice extends Document {
  deviceLibraryIdentifier: string
  pushToken: string
  serialNumber: string
  createdAt: Date
  updatedAt: Date
}

const LoyaltyDeviceSchema = new Schema<ILoyaltyDevice>(
  {
    deviceLibraryIdentifier: { type: String, required: true },
    pushToken: { type: String, required: true },
    serialNumber: { type: String, required: true, index: true },
  },
  { timestamps: true }
)

LoyaltyDeviceSchema.index({ deviceLibraryIdentifier: 1, serialNumber: 1 }, { unique: true })

export const LoyaltyDevice: Model<ILoyaltyDevice> =
  mongoose.models.LoyaltyDevice ||
  mongoose.model<ILoyaltyDevice>("LoyaltyDevice", LoyaltyDeviceSchema)
