import mongoose, { Schema, Document, Model } from "mongoose"
import { features } from "@/lib/features"

export interface IPlace extends Document {
  name: string
  type: "restaurant" | "cafe" | "bakery" | "store" | "icecream" | "bar" | "other"
  types?: string[]
  address: string
  neighborhood: string
  location: {
    lat: number
    lng: number
  }
  tags: string[]
  contact?: {
    instagram?: string
    whatsapp?: string
    phone?: string
    url?: string
  }
  openingHours?: string
  delivery?: {
    available: boolean
    rappi?: string
    pedidosya?: string
    other?: string
  }
  photos: string[]
  status: "approved" | "pending"
  // Fase 2
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  lastConfirmedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PlaceSchema = new Schema<IPlace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"],
      required: true,
    },
    types: {
      type: [String],
      enum: ["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"],
      default: undefined,
    },
    address: {
      type: String,
      required: true,
    },
    neighborhood: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    contact: {
      instagram: String,
      whatsapp: String,
      phone: String,
      url: String,
    },
    openingHours: String,
    delivery: {
      available: { type: Boolean, default: false },
      rappi: String,
      pedidosya: String,
      other: String,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 3 || features.phase2
        },
        message: "Maximum 3 photos allowed in phase 1",
      },
    },
    status: {
      type: String,
      enum: ["approved", "pending"],
      default: "pending",
      index: true,
    },
    // Fase 2
    safetyLevel: {
      type: String,
      enum: ["dedicated_gf", "gf_options", "cross_contamination_risk", "unknown"],
    },
    lastConfirmedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
PlaceSchema.index({ location: "2dsphere" })
PlaceSchema.index({ name: "text", address: "text", neighborhood: "text" })
PlaceSchema.index({ status: 1, type: 1 })
PlaceSchema.index({ neighborhood: 1, type: 1 })

export const Place: Model<IPlace> =
  mongoose.models.Place || mongoose.model<IPlace>("Place", PlaceSchema)
