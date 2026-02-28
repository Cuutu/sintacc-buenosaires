import mongoose, { Schema, Document, Model } from "mongoose"

export interface IListLike extends Document {
  listId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  createdAt: Date
}

const ListLikeSchema = new Schema<IListLike>(
  {
    listId: {
      type: Schema.Types.ObjectId,
      ref: "List",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

ListLikeSchema.index({ listId: 1, userId: 1 }, { unique: true })

export const ListLike: Model<IListLike> =
  mongoose.models.ListLike || mongoose.model<IListLike>("ListLike", ListLikeSchema)
