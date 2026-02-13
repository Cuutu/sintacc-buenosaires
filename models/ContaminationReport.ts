import mongoose, { Schema, Document, Model } from "mongoose"

export interface IContaminationReport extends Document {
  placeId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  comment: string
  status: "visible" | "hidden"
  createdAt: Date
  updatedAt: Date
}

const ContaminationReportSchema = new Schema<IContaminationReport>(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
  },
  { timestamps: true }
)

ContaminationReportSchema.index({ placeId: 1, status: 1 })

export const ContaminationReport: Model<IContaminationReport> =
  mongoose.models.ContaminationReport ||
  mongoose.model<IContaminationReport>("ContaminationReport", ContaminationReportSchema)
