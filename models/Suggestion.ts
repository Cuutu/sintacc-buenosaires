import mongoose, { Schema, Document, Model } from "mongoose"
import { IPlace } from "./Place"
import type { AiResearch } from "@/lib/place-research/types"
import { AiResearchSchema } from "./Suggestion.aiResearch"

export interface ISuggestion extends Document {
  placeDraft: Partial<IPlace>
  suggestedByUserId: mongoose.Types.ObjectId
  status: "pending" | "approved" | "rejected"
  rejectionReason?: string
  rejectedAt?: Date
  rejectedByUserId?: mongoose.Types.ObjectId
  aiResearch?: AiResearch
  createdAt: Date
  updatedAt: Date
}

const SuggestionSchema = new Schema<ISuggestion>(
  {
    placeDraft: {
      type: Schema.Types.Mixed,
      required: true,
    },
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
    rejectionReason: String,
    rejectedAt: Date,
    rejectedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    aiResearch: {
      type: AiResearchSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
)

SuggestionSchema.index({ status: 1, createdAt: -1 })
SuggestionSchema.index({ status: 1, "aiResearch.status": 1 })

export const Suggestion: Model<ISuggestion> =
  mongoose.models.Suggestion ||
  mongoose.model<ISuggestion>("Suggestion", SuggestionSchema)
