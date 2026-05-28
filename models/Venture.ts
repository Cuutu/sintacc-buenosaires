import mongoose, { Schema, Document, Model } from "mongoose"
import {
  ventureCategoryIds,
  ventureModalityIds,
  ventureSafetyLevelIds,
} from "@/lib/venture-constants"

export interface IVenture extends Document {
  name: string
  category: (typeof ventureCategoryIds)[number]
  zone: string
  modalities: (typeof ventureModalityIds)[number][]
  safetyLevel: (typeof ventureSafetyLevelIds)[number]
  contact?: {
    instagram?: string
    whatsapp?: string
  }
  certifiedProducts?: boolean
  purchaseChannels?: string
  description?: string
  photos: string[]
  status: "approved" | "pending"
  source?: "suggestion" | "manual"
  createdAt: Date
  updatedAt: Date
}

const VentureSchema = new Schema<IVenture>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ventureCategoryIds,
      required: true,
      index: true,
    },
    zone: { type: String, required: true, trim: true },
    modalities: {
      type: [String],
      enum: ventureModalityIds,
      default: [],
    },
    safetyLevel: {
      type: String,
      enum: ventureSafetyLevelIds,
      default: "to_confirm",
    },
    contact: {
      instagram: String,
      whatsapp: String,
    },
    certifiedProducts: { type: Boolean, default: false },
    purchaseChannels: String,
    description: String,
    photos: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length <= 3,
        message: "Máximo 3 fotos",
      },
      default: [],
    },
    status: {
      type: String,
      enum: ["approved", "pending"],
      default: "approved",
      index: true,
    },
    source: {
      type: String,
      enum: ["suggestion", "manual"],
      default: "manual",
    },
  },
  { timestamps: true }
)

VentureSchema.index({ status: 1, category: 1, createdAt: -1 })
VentureSchema.index({ name: "text", zone: "text" })

export const Venture: Model<IVenture> =
  mongoose.models.Venture || mongoose.model<IVenture>("Venture", VentureSchema)
