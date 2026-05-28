import mongoose, { Schema, Document, Model } from "mongoose"
import { IVenture } from "./Venture"

export interface IVentureSuggestion extends Document {
  ventureDraft: Partial<IVenture>
  suggesterComment?: string
  shipsNationwide?: boolean
  suggestedByUserId: mongoose.Types.ObjectId
  status: "pending" | "approved" | "rejected"
  createdAt: Date
  updatedAt: Date
}

const VentureSuggestionSchema = new Schema<IVentureSuggestion>(
  {
    ventureDraft: {
      type: Schema.Types.Mixed,
      required: true,
    },
    suggesterComment: String,
    shipsNationwide: Boolean,
    suggestedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
)

VentureSuggestionSchema.index({ status: 1, createdAt: -1 })

export const VentureSuggestion: Model<IVentureSuggestion> =
  mongoose.models.VentureSuggestion ||
  mongoose.model<IVentureSuggestion>("VentureSuggestion", VentureSuggestionSchema)
