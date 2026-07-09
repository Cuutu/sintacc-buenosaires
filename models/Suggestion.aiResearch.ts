import { Schema } from "mongoose"
import type { AiResearch } from "@/lib/place-research/types"

export const AiResearchSchema = new Schema<AiResearch>(
  {
    status: {
      type: String,
      enum: ["pending", "queued", "running", "done", "failed"],
      default: "pending",
    },
    startedAt: Date,
    ranAt: Date,
    googlePlaceId: String,
    matchConfidence: Number,
    gfConfidence: Number,
    recommendedSafetyLevel: String,
    recommendedType: String,
    summary: { type: String, default: "" },
    evidence: [
      {
        source: {
          type: String,
          enum: ["google", "website", "user_link", "reviews"],
        },
        quote: String,
        url: String,
      },
    ],
    suggestedDraftPatch: { type: Schema.Types.Mixed },
    needsAdmin: { type: Boolean, default: true },
    error: String,
    costUsd: Number,
    model: String,
    draftAutoFilled: Boolean,
    duplicateWarnings: [
      new Schema(
        {
          id: String,
          kind: { type: String, enum: ["place", "suggestion"] },
          name: String,
          address: String,
          neighborhood: String,
          // "type" necesita forma explícita: si no, Mongoose lee el subdoc como [String]
          type: { type: String },
          score: Number,
          reasons: [String],
          distanceMeters: Number,
          status: String,
          matchLevel: { type: String, enum: ["exact", "likely"] },
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
)
