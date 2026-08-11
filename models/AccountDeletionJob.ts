import mongoose, { Schema, Document, Model } from "mongoose"
import type { AppleRevokeOutcome } from "@/lib/account-deletion-constants"

export type AccountDeletionStatus =
  | "claimed"
  | "database_deleted"
  | "cloudinary_pending"
  | "completed"
  | "completed_manual_apple_revoke"
  | "failed_retryable"

export interface IAccountDeletionJob extends Document {
  /** Opaque Mongo ObjectId of deleted user — not email/name/appleSub. */
  userId: mongoose.Types.ObjectId
  status: AccountDeletionStatus
  appleRevoke: AppleRevokeOutcome
  /** Validated Cloudinary public_ids only — never full URLs, never UGC text. */
  cloudinaryPendingPublicIds: string[]
  retryCount: number
  nextAttemptAt?: Date
  /** Technical code only — never tokens / email / URLs. */
  lastErrorCode?: string
  claimedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TERMINAL_STATUSES: AccountDeletionStatus[] = [
  "completed",
  "completed_manual_apple_revoke",
]

const AccountDeletionJobSchema = new Schema<IAccountDeletionJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "claimed",
        "database_deleted",
        "cloudinary_pending",
        "completed",
        "completed_manual_apple_revoke",
        "failed_retryable",
      ],
      required: true,
      index: true,
    },
    appleRevoke: {
      type: String,
      enum: [
        "not_applicable",
        "revoked",
        "manual_required",
        "skipped_no_code",
        "skipped_no_keys",
        "failed",
      ],
      required: true,
    },
    cloudinaryPendingPublicIds: {
      type: [String],
      default: [],
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      index: true,
    },
    lastErrorCode: {
      type: String,
      maxlength: 64,
    },
    claimedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

/** Terminal jobs expire after 7 days — no lingering public_ids. */
AccountDeletionJobSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 7,
    partialFilterExpression: {
      status: { $in: TERMINAL_STATUSES },
    },
  }
)

export const ACCOUNT_DELETION_MAX_RETRIES = 5

export const AccountDeletionJob: Model<IAccountDeletionJob> =
  mongoose.models.AccountDeletionJob ||
  mongoose.model<IAccountDeletionJob>(
    "AccountDeletionJob",
    AccountDeletionJobSchema
  )
