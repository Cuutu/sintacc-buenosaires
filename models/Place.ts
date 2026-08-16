import mongoose, { Schema, Document, Model } from "mongoose"
import { features } from "@/lib/features"
import type { AiResearch } from "@/lib/place-research/types"
import { AiResearchSchema } from "@/models/Suggestion.aiResearch"

export type GoogleSnapshotReview = {
  text: string
  rating?: number
  authorName?: string
  relativeTime?: string
}

export type GoogleGlutenRelevantReview = {
  text: string
  rating?: number
  authorName?: string
  relativeTime?: string
  relevanceScore: number
}

export type GooglePlaceSnapshot = {
  rating?: number
  userRatingCount?: number
  reviewSummaryText?: string
  googleMapsUri?: string
  reviews: GoogleSnapshotReview[]
  glutenRelevant: GoogleGlutenRelevantReview[]
  glutenSignalSummary?: string
  syncedAt: Date
}

export type GoogleSyncState = {
  status: "queued" | "running" | "done" | "failed"
  startedAt?: Date
  ranAt?: Date
  error?: string
}

export interface IPlace extends Document {
  name: string
  type: "restaurant" | "cafe" | "bakery" | "store" | "icecream" | "bar" | "other"
  types?: string[]
  address: string
  neighborhood: string
  /** Slug normalizado de la jurisdicción (ej: "tucuman", "buenos-aires", "caba") */
  province?: string
  /** Slug normalizado de la localidad/ciudad (ej: "san-miguel-de-tucuman", "la-plata") */
  locality?: string
  slug?: string
  location: {
    lat: number
    lng: number
  }
  /** Dirección humana detectada (reverse geocode) o ingresada */
  addressText?: string
  /** exact = calle/POI; approx = usuario marcó "aproximada" */
  locationPrecision?: "exact" | "approx"
  /** Si reverse falló, usuario ingresó barrio */
  userProvidedNeighborhood?: string
  /** Si reverse falló, referencia opcional */
  userProvidedReference?: string
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
  /** community = subida; google = portada Places API */
  photoSource?: "community" | "google"
  status: "approved" | "pending"
  /** Origen del dato: excel, kml, suggestion, manual */
  source?: "excel" | "kml" | "suggestion" | "manual"
  // Fase 2
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  lastConfirmedAt?: Date
  aiEnrichment?: AiResearch
  /** Places API place id (ChIJ…) */
  googlePlaceId?: string
  /** Cache de rating + reviews Google (sync admin) */
  googleSnapshot?: GooglePlaceSnapshot
  /** Estado de la cola de sync Google */
  googleSync?: GoogleSyncState
  /** Destacado en home (selección admin) */
  featured?: boolean
  /** Orden entre destacados (menor = primero) */
  featuredOrder?: number
  description?: string
  pickup?: boolean
  seo?: {
    metaTitle?: string
    metaDescription?: string
    canonical?: string
  }
  editLog?: Array<{ at: Date; by?: string; fields: string[] }>
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
    province: {
      type: String,
      index: true,
    },
    locality: {
      type: String,
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    addressText: String,
    locationPrecision: { type: String, enum: ["exact", "approx"] },
    userProvidedNeighborhood: String,
    userProvidedReference: String,
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
    photoSource: {
      type: String,
      enum: ["community", "google"],
    },
    status: {
      type: String,
      enum: ["approved", "pending"],
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["excel", "kml", "suggestion", "manual"],
    },
    // Fase 2
    safetyLevel: {
      type: String,
      enum: ["dedicated_gf", "gf_options", "cross_contamination_risk", "unknown"],
    },
    lastConfirmedAt: {
      type: Date,
    },
    aiEnrichment: {
      type: AiResearchSchema,
      required: false,
    },
    googlePlaceId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    googleSnapshot: {
      rating: Number,
      userRatingCount: Number,
      reviewSummaryText: String,
      googleMapsUri: String,
      reviews: [
        {
          text: { type: String, required: true },
          rating: Number,
          authorName: String,
          relativeTime: String,
        },
      ],
      glutenRelevant: [
        {
          text: { type: String, required: true },
          rating: Number,
          authorName: String,
          relativeTime: String,
          relevanceScore: { type: Number, required: true },
        },
      ],
      glutenSignalSummary: String,
      syncedAt: Date,
    },
    googleSync: {
      status: {
        type: String,
        enum: ["queued", "running", "done", "failed"],
      },
      startedAt: Date,
      ranAt: Date,
      error: String,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredOrder: {
      type: Number,
      min: 0,
    },
    description: { type: String, trim: true },
    pickup: { type: Boolean, default: false },
    seo: {
      metaTitle: String,
      metaDescription: String,
      canonical: String,
    },
    editLog: [
      {
        at: Date,
        by: String,
        fields: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Indexes
PlaceSchema.index({ location: "2dsphere" })
PlaceSchema.index({ name: "text", address: "text", neighborhood: "text" })
PlaceSchema.index({ status: 1, createdAt: -1 })
PlaceSchema.index({ status: 1, type: 1 })
PlaceSchema.index({ status: 1, type: 1, createdAt: -1 })
PlaceSchema.index({ neighborhood: 1, type: 1 })
PlaceSchema.index({ status: 1, neighborhood: 1, createdAt: -1 })
PlaceSchema.index({ status: 1, province: 1 })
PlaceSchema.index({ status: 1, province: 1, type: 1 })
PlaceSchema.index({ status: 1, province: 1, locality: 1 })
PlaceSchema.index({ status: 1, province: 1, locality: 1, type: 1 })
PlaceSchema.index({ status: 1, slug: 1 })
PlaceSchema.index({ status: 1, safetyLevel: 1, createdAt: -1 })
PlaceSchema.index({ status: 1, tags: 1, createdAt: -1 })
PlaceSchema.index({ "contact.instagram": 1, status: 1 })
PlaceSchema.index({ status: 1, "googleSync.status": 1 })
PlaceSchema.index({ status: 1, "googleSnapshot.syncedAt": 1 })
PlaceSchema.index({ status: 1, featured: 1, featuredOrder: 1 })

export const Place: Model<IPlace> =
  mongoose.models.Place || mongoose.model<IPlace>("Place", PlaceSchema)