import mongoose, { Schema, Document, Model } from "mongoose"
import { features } from "@/lib/features"

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId
  placeId: mongoose.Types.ObjectId
  createdAt: Date
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

FavoriteSchema.index({ userId: 1, placeId: 1 }, { unique: true })

export const Favorite: Model<IFavorite> =
  mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema)
