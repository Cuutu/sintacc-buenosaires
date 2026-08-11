import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUser extends Document {
  email: string
  name: string
  image?: string
  role: "user" | "admin"
  /** Stable Apple Sign In subject (`sub`). Sparse unique — Google users omit it. */
  appleSub?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    appleSub: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Sparse unique: many users have no Apple identity.
UserSchema.index(
  { appleSub: 1 },
  { unique: true, sparse: true, name: "appleSub_sparse_unique" }
)

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
