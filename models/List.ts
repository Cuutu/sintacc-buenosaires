import mongoose, { Schema, Document, Model } from "mongoose"

export interface IList extends Document {
  name: string
  description?: string
  placeIds: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  likesCount: number
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

const ListSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    placeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Place",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

ListSchema.index({ isPublic: 1, likesCount: -1 })

export const List: Model<IList> =
  mongoose.models.List || mongoose.model<IList>("List", ListSchema)
