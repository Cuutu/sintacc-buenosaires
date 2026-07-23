import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPushToken extends Document {
  token: string
  platform: "ios" | "android" | "web"
  userId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    token: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
)

export const PushToken: Model<IPushToken> =
  mongoose.models.PushToken || mongoose.model<IPushToken>("PushToken", PushTokenSchema)
