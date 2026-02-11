import mongoose, { Schema, Document } from "mongoose"

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  email: string
  subject: string
  message: string
  status: "pending" | "read"
  createdAt: Date
}

const ContactSchema = new Schema<IContact>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "read"],
      default: "pending",
    },
  },
  { timestamps: true }
)

export const Contact =
  (mongoose.models.Contact as mongoose.Model<IContact>) ??
  mongoose.model<IContact>("Contact", ContactSchema)
