import mongoose, { Schema, Document, Model } from "mongoose"
import {
  DESTINATION_MAX_LENGTH,
  LIST_LINK_STATUS,
  LIST_VISIBILITY,
  PLACE_NOTE_MAX_LENGTH,
  type ListLinkStatus,
  type ListVisibility,
} from "@/lib/lists/constants"

export interface IListPlaceNote {
  placeId: mongoose.Types.ObjectId
  note?: string
}

export interface IList extends Document {
  name: string
  description?: string
  destination?: string
  coverImage?: string
  placeIds: mongoose.Types.ObjectId[]
  placeNotes: IListPlaceNote[]
  createdBy: mongoose.Types.ObjectId
  likesCount: number
  /** Legacy mirror: true iff visibility === PUBLIC */
  isPublic: boolean
  visibility: ListVisibility
  privateAccessToken?: string | null
  linkStatus?: ListLinkStatus | null
  createdAt: Date
  updatedAt: Date
}

const PlaceNoteSchema = new Schema<IListPlaceNote>(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: PLACE_NOTE_MAX_LENGTH,
    },
  },
  { _id: false }
)

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
    destination: {
      type: String,
      trim: true,
      maxlength: DESTINATION_MAX_LENGTH,
    },
    coverImage: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    placeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Place",
      },
    ],
    placeNotes: {
      type: [PlaceNoteSchema],
      default: [],
    },
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
    visibility: {
      type: String,
      enum: Object.values(LIST_VISIBILITY),
      default: LIST_VISIBILITY.PUBLIC,
      index: true,
    },
    privateAccessToken: {
      type: String,
      default: null,
      select: false,
    },
    linkStatus: {
      type: String,
      enum: Object.values(LIST_LINK_STATUS),
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

ListSchema.index({ isPublic: 1, likesCount: -1, createdAt: -1 })
ListSchema.index({ createdBy: 1, updatedAt: -1 })
ListSchema.index(
  { privateAccessToken: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      privateAccessToken: { $type: "string" },
    },
  }
)
ListSchema.index({ visibility: 1, linkStatus: 1, updatedAt: -1 })

export const List: Model<IList> =
  mongoose.models.List || mongoose.model<IList>("List", ListSchema)
