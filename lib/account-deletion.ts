/**
 * Central account deletion service (Guideline 5.1.1).
 * Caller must already authenticate the session user — never accept client userId.
 *
 * Order for Apple accounts:
 * 1 reauth → 2 challenge → 3 verify idToken → 4 sub match → 5 exchange → 6 revoke
 * → 7 delete CeliMap data (even if Apple down) → 8 manual fallback info → 9 client signOut
 */

import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import {
  destroyCloudinaryPublicIds,
} from "@/lib/cloudinary/destroy-assets"
import { parseCloudinaryPublicIdFromUrl } from "@/lib/cloudinary/public-id-from-url"
import {
  exchangeAndRevokeAppleAuthorization,
  type AppleRevokeCode,
} from "@/lib/apple-token-revoke"
import {
  appleRequestNonceFromRaw,
  consumeNativeAppleChallenge,
  verifyAppleIdToken,
} from "@/lib/native-apple-auth"
import {
  ACCOUNT_DELETION_MAX_RETRIES,
  AccountDeletionJob,
  type AccountDeletionStatus,
} from "@/models/AccountDeletionJob"
import { User } from "@/models/User"
import { Favorite } from "@/models/Favorite"
import { List } from "@/models/List"
import { ListLike } from "@/models/ListLike"
import { Review } from "@/models/Review"
import { VentureReview } from "@/models/VentureReview"
import { ContaminationReport } from "@/models/ContaminationReport"
import { Suggestion } from "@/models/Suggestion"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Contact } from "@/models/Contact"
import { PushToken } from "@/models/PushToken"
import { RateLimit } from "@/models/RateLimit"
import { NativeGoogleGrant } from "@/models/NativeGoogleGrant"
import { NativeAppleGrant } from "@/models/NativeAppleGrant"
import { MobileAuthHandoff } from "@/models/MobileAuthHandoff"
import {
  ACCOUNT_DELETE_CONFIRM,
  appleRevokeNeedsManualInstructions,
  type AppleRevokeOutcome,
} from "@/lib/account-deletion-constants"

export { ACCOUNT_DELETE_CONFIRM, type AppleRevokeOutcome }

const TERMINAL: AccountDeletionStatus[] = [
  "completed",
  "completed_manual_apple_revoke",
]

const EMPTY_COUNTS = {
  favorites: 0,
  lists: 0,
  listLikes: 0,
  reviews: 0,
  ventureReviews: 0,
  contaminationReports: 0,
  suggestions: 0,
  ventureSuggestions: 0,
  contacts: 0,
  pushTokens: 0,
  rateLimits: 0,
  grants: 0,
  handoffs: 0,
  user: 0,
}

export type AppleReauthPayload = {
  challengeId: string
  idToken: string
  authorizationCode?: string
}

export type DeleteAccountInput = {
  authenticatedUserId: string
  confirm: string
  apple?: AppleReauthPayload
  dryRun?: boolean
  appleRevokeFn?: typeof exchangeAndRevokeAppleAuthorization
}

export type DeleteAccountResult = {
  ok: true
  alreadyDeleted?: boolean
  appleRevoke: AppleRevokeOutcome
  appleManualInstructions: boolean
  cloudinaryPending: number
  deleted: typeof EMPTY_COUNTS
}

export class AccountDeletionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unauthorized"
      | "invalid_confirm"
      | "invalid_user_id"
      | "apple_sub_mismatch"
      | "apple_reauth_required"
      | "apple_reauth_failed"
      | "concurrent"
      | "not_found",
    public readonly httpStatus: number = 400
  ) {
    super(message)
    this.name = "AccountDeletionError"
  }
}

function assertObjectId(id: string): mongoose.Types.ObjectId {
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AccountDeletionError("Invalid user id", "invalid_user_id", 400)
  }
  return new mongoose.Types.ObjectId(id)
}

function mapAppleCodeToOutcome(code: AppleRevokeCode): AppleRevokeOutcome {
  switch (code) {
    case "revoked":
    case "already_revoked":
      return "revoked"
    case "missing_keys":
      return "skipped_no_keys"
    case "missing_code":
      return "skipped_no_code"
    default:
      return "failed"
  }
}

function collectUrls(...groups: Array<string[] | undefined | null>): string[] {
  const out: string[] = []
  for (const g of groups) {
    if (!g) continue
    for (const u of g) {
      if (typeof u === "string" && u.includes("res.cloudinary.com")) {
        out.push(u)
      }
    }
  }
  return out
}

function urlsToPublicIds(urls: string[]): {
  publicIds: string[]
  unparseable: number
} {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() || ""
  const publicIds: string[] = []
  let unparseable = 0
  if (!cloud) {
    return { publicIds: [], unparseable: urls.length }
  }
  for (const url of urls) {
    const parsed = parseCloudinaryPublicIdFromUrl(url, cloud)
    if (parsed.ok) publicIds.push(parsed.publicId)
    else unparseable += 1
  }
  return { publicIds: [...new Set(publicIds)], unparseable }
}

function terminalStatus(manual: boolean): AccountDeletionStatus {
  return manual ? "completed_manual_apple_revoke" : "completed"
}

async function revokeAppleIfNeeded(
  user: { appleSub?: string | null },
  apple: AppleReauthPayload | undefined,
  revokeFn: typeof exchangeAndRevokeAppleAuthorization
): Promise<{ outcome: AppleRevokeOutcome; manual: boolean }> {
  if (!user.appleSub) {
    return { outcome: "not_applicable", manual: false }
  }

  if (!apple?.challengeId || !apple?.idToken) {
    return { outcome: "manual_required", manual: true }
  }

  try {
    const challenge = await consumeNativeAppleChallenge(apple.challengeId)
    const identity = await verifyAppleIdToken({
      idToken: apple.idToken,
      expectedNonceHash: appleRequestNonceFromRaw(challenge.nonceRaw),
    })
    if (identity.sub !== user.appleSub) {
      throw new AccountDeletionError(
        "Apple identity does not match this account",
        "apple_sub_mismatch",
        403
      )
    }
  } catch (error) {
    if (error instanceof AccountDeletionError) throw error
    throw new AccountDeletionError(
      "Apple reauthentication failed",
      "apple_reauth_failed",
      401
    )
  }

  const authCode = apple.authorizationCode?.trim()
  if (!authCode) {
    return { outcome: "skipped_no_code", manual: true }
  }

  const revoke = await revokeFn(authCode)
  // Only claim revoked when Apple exchange+revoke reported success.
  if (revoke.ok && (revoke.code === "revoked" || revoke.code === "already_revoked")) {
    return { outcome: "revoked", manual: false }
  }
  const outcome = mapAppleCodeToOutcome(revoke.code)
  return {
    outcome,
    manual: true,
  }
}

type Counts = DeleteAccountResult["deleted"]

async function deleteUserOwnedData(
  userObjectId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession | null
): Promise<{ counts: Counts; cloudinaryUrls: string[] }> {
  const opts = session ? { session } : {}
  const counts: Counts = { ...EMPTY_COUNTS }
  const cloudinaryUrls: string[] = []

  const lists = await List.find({ createdBy: userObjectId })
    .select("coverImage _id")
    .lean()
    .session(session)
  for (const list of lists) {
    if (list.coverImage) cloudinaryUrls.push(...collectUrls([list.coverImage]))
  }
  const listIds = lists.map((l) => l._id)

  const reviews = await Review.find({ userId: userObjectId })
    .select("evidencePhotos")
    .lean()
    .session(session)
  for (const r of reviews) {
    cloudinaryUrls.push(...collectUrls(r.evidencePhotos))
  }

  const suggestions = await Suggestion.find({ suggestedByUserId: userObjectId })
    .select("placeDraft")
    .lean()
    .session(session)
  for (const s of suggestions) {
    const photos = (s.placeDraft as { photos?: string[] } | undefined)?.photos
    cloudinaryUrls.push(...collectUrls(photos))
  }

  const ventureSuggestions = await VentureSuggestion.find({
    suggestedByUserId: userObjectId,
  })
    .select("ventureDraft")
    .lean()
    .session(session)
  for (const s of ventureSuggestions) {
    const photos = (s.ventureDraft as { photos?: string[] } | undefined)?.photos
    cloudinaryUrls.push(...collectUrls(photos))
  }

  counts.favorites = (
    await Favorite.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount

  const othersLikes = await ListLike.find({
    userId: userObjectId,
    ...(listIds.length ? { listId: { $nin: listIds } } : {}),
  })
    .select("listId")
    .lean()
    .session(session)

  for (const like of othersLikes) {
    await List.updateOne(
      { _id: like.listId, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } },
      opts
    )
  }

  if (listIds.length > 0) {
    counts.listLikes += (
      await ListLike.deleteMany({ listId: { $in: listIds } }, opts)
    ).deletedCount
  }
  counts.listLikes += (
    await ListLike.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount

  counts.lists = (
    await List.deleteMany({ createdBy: userObjectId }, opts)
  ).deletedCount
  counts.reviews = (
    await Review.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.ventureReviews = (
    await VentureReview.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.contaminationReports = (
    await ContaminationReport.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.suggestions = (
    await Suggestion.deleteMany({ suggestedByUserId: userObjectId }, opts)
  ).deletedCount
  counts.ventureSuggestions = (
    await VentureSuggestion.deleteMany({ suggestedByUserId: userObjectId }, opts)
  ).deletedCount

  await Suggestion.updateMany(
    { rejectedByUserId: userObjectId },
    { $unset: { rejectedByUserId: 1 } },
    opts
  )
  await VentureSuggestion.updateMany(
    { rejectedByUserId: userObjectId },
    { $unset: { rejectedByUserId: 1 } },
    opts
  )

  counts.contacts = (
    await Contact.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.pushTokens = (
    await PushToken.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.rateLimits = (
    await RateLimit.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount
  counts.grants =
    (await NativeGoogleGrant.deleteMany({ userId: userObjectId }, opts))
      .deletedCount +
    (await NativeAppleGrant.deleteMany({ userId: userObjectId }, opts))
      .deletedCount
  counts.handoffs = (
    await MobileAuthHandoff.deleteMany({ userId: userObjectId }, opts)
  ).deletedCount

  counts.user = (
    await User.deleteOne({ _id: userObjectId }, opts)
  ).deletedCount

  return { counts, cloudinaryUrls: [...new Set(cloudinaryUrls)] }
}

async function finalizeJob(
  userObjectId: mongoose.Types.ObjectId,
  appleRevoke: AppleRevokeOutcome,
  pendingPublicIds: string[],
  extraError?: string
) {
  const manual = appleRevokeNeedsManualInstructions(appleRevoke)
  if (pendingPublicIds.length > 0) {
    await AccountDeletionJob.updateOne(
      { userId: userObjectId },
      {
        $set: {
          status: "cloudinary_pending",
          appleRevoke,
          cloudinaryPendingPublicIds: pendingPublicIds,
          retryCount: 0,
          nextAttemptAt: new Date(Date.now() + 60_000),
          lastErrorCode: extraError || "cloudinary_pending",
          completedAt: undefined,
        },
      }
    )
    return pendingPublicIds.length
  }

  await AccountDeletionJob.updateOne(
    { userId: userObjectId },
    {
      $set: {
        status: terminalStatus(manual),
        appleRevoke,
        cloudinaryPendingPublicIds: [],
        retryCount: 0,
        nextAttemptAt: undefined,
        lastErrorCode: undefined,
        completedAt: new Date(),
      },
      $unset: { nextAttemptAt: 1 },
    }
  )
  return 0
}

/**
 * Delete the authenticated user's account and associated personal/UGC data.
 * Place/Venture catalog documents are RETAINED.
 */
export async function deleteAuthenticatedAccount(
  input: DeleteAccountInput
): Promise<DeleteAccountResult> {
  if (input.confirm !== ACCOUNT_DELETE_CONFIRM) {
    throw new AccountDeletionError(
      "Confirmation required",
      "invalid_confirm",
      400
    )
  }

  const userObjectId = assertObjectId(input.authenticatedUserId)
  await connectDB()

  const existingJob = await AccountDeletionJob.findOne({
    userId: userObjectId,
    status: { $in: TERMINAL },
  }).lean()
  if (existingJob) {
    return {
      ok: true,
      alreadyDeleted: true,
      appleRevoke: existingJob.appleRevoke,
      appleManualInstructions: appleRevokeNeedsManualInstructions(
        existingJob.appleRevoke
      ),
      cloudinaryPending: 0,
      deleted: { ...EMPTY_COUNTS },
    }
  }

  const user = await User.findById(userObjectId).lean()
  if (!user) {
    return {
      ok: true,
      alreadyDeleted: true,
      appleRevoke: "not_applicable",
      appleManualInstructions: false,
      cloudinaryPending: 0,
      deleted: { ...EMPTY_COUNTS },
    }
  }

  const claimWindowMs = 120_000
  try {
    await AccountDeletionJob.create({
      userId: userObjectId,
      status: "claimed",
      appleRevoke: "not_applicable",
      cloudinaryPendingPublicIds: [],
      retryCount: 0,
      claimedAt: new Date(),
    })
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: number }).code
        : undefined
    if (code === 11000) {
      const job = await AccountDeletionJob.findOne({ userId: userObjectId }).lean()
      if (job && TERMINAL.includes(job.status as AccountDeletionStatus)) {
        return {
          ok: true,
          alreadyDeleted: true,
          appleRevoke: job.appleRevoke,
          appleManualInstructions: appleRevokeNeedsManualInstructions(
            job.appleRevoke
          ),
          cloudinaryPending: job.cloudinaryPendingPublicIds?.length ?? 0,
          deleted: { ...EMPTY_COUNTS },
        }
      }
      if (
        job &&
        (job.status === "claimed" || job.status === "database_deleted") &&
        Date.now() - new Date(job.claimedAt).getTime() < claimWindowMs
      ) {
        throw new AccountDeletionError(
          "Account deletion already in progress",
          "concurrent",
          409
        )
      }
      await AccountDeletionJob.updateOne(
        { userId: userObjectId },
        {
          $set: {
            status: "claimed",
            claimedAt: new Date(),
            lastErrorCode: "stale_reclaim",
          },
        }
      )
    } else {
      throw error
    }
  }

  if (input.dryRun) {
    await AccountDeletionJob.deleteOne({ userId: userObjectId })
    return {
      ok: true,
      appleRevoke: user.appleSub ? "manual_required" : "not_applicable",
      appleManualInstructions: Boolean(user.appleSub),
      cloudinaryPending: 0,
      deleted: { ...EMPTY_COUNTS },
    }
  }

  // Apple reauth/revoke BEFORE any CeliMap data wipe (identity must match).
  const revokeFn = input.appleRevokeFn ?? exchangeAndRevokeAppleAuthorization
  let appleRevoke: AppleRevokeOutcome
  let appleManual: boolean
  try {
    const revoked = await revokeAppleIfNeeded(user, input.apple, revokeFn)
    appleRevoke = revoked.outcome
    appleManual = revoked.manual
  } catch (error) {
    await AccountDeletionJob.deleteOne({
      userId: userObjectId,
      status: "claimed",
    })
    throw error
  }

  await AccountDeletionJob.updateOne(
    { userId: userObjectId },
    { $set: { appleRevoke } }
  )

  let counts: Counts = { ...EMPTY_COUNTS }
  let cloudinaryUrls: string[] = []

  // Default: sequential idempotent deletes (safe without txn).
  // ACCOUNT_DELETION_USE_TXN=1 optional on Atlas replica set — not required for safety.
  const useTxn = process.env.ACCOUNT_DELETION_USE_TXN === "1"
  const conn = mongoose.connection
  const supportsTxn =
    useTxn &&
    conn.readyState === 1 &&
    typeof conn.startSession === "function"

  if (supportsTxn) {
    const session = await conn.startSession()
    try {
      await session.withTransaction(async () => {
        const result = await deleteUserOwnedData(userObjectId, session)
        counts = result.counts
        cloudinaryUrls = result.cloudinaryUrls
      })
    } catch {
      const result = await deleteUserOwnedData(userObjectId, null)
      counts = result.counts
      cloudinaryUrls = result.cloudinaryUrls
      await AccountDeletionJob.updateOne(
        { userId: userObjectId },
        { $set: { lastErrorCode: "txn_fallback" } }
      )
    } finally {
      await session.endSession()
    }
  } else {
    const result = await deleteUserOwnedData(userObjectId, null)
    counts = result.counts
    cloudinaryUrls = result.cloudinaryUrls
  }

  // User row is gone — account cannot be reactivated by partial failure.
  await AccountDeletionJob.updateOne(
    { userId: userObjectId },
    { $set: { status: "database_deleted" } }
  )

  const { publicIds, unparseable } = urlsToPublicIds(cloudinaryUrls)
  const destroy = await destroyCloudinaryPublicIds(publicIds)
  const pending = destroy.failed
  const pendingCount = await finalizeJob(
    userObjectId,
    appleRevoke,
    pending,
    unparseable > 0 ? "cloudinary_unparseable" : undefined
  )

  return {
    ok: true,
    appleRevoke,
    appleManualInstructions: appleManual,
    cloudinaryPending: pendingCount,
    deleted: counts,
  }
}

/**
 * Retry Cloudinary destroys for jobs in cloudinary_pending / failed_retryable.
 * Safe to run dry-run. Never logs public payloads beyond counts.
 */
export async function retryPendingCloudinaryCleanups(options?: {
  dryRun?: boolean
  limit?: number
}): Promise<{
  scanned: number
  destroyed: number
  stillPending: number
  abandoned: number
}> {
  await connectDB()
  const limit = options?.limit ?? 50
  const now = new Date()
  const jobs = await AccountDeletionJob.find({
    status: { $in: ["cloudinary_pending", "failed_retryable"] },
    $or: [
      { nextAttemptAt: { $lte: now } },
      { nextAttemptAt: { $exists: false } },
    ],
  })
    .sort({ nextAttemptAt: 1 })
    .limit(limit)
    .lean()

  let destroyed = 0
  let stillPending = 0
  let abandoned = 0

  for (const job of jobs) {
    const ids = job.cloudinaryPendingPublicIds || []
    if (ids.length === 0) {
      const manual = appleRevokeNeedsManualInstructions(job.appleRevoke)
      if (!options?.dryRun) {
        await AccountDeletionJob.updateOne(
          { _id: job._id },
          {
            $set: {
              status: terminalStatus(manual),
              completedAt: new Date(),
              cloudinaryPendingPublicIds: [],
              lastErrorCode: undefined,
            },
          }
        )
      }
      continue
    }

    const result = await destroyCloudinaryPublicIds(ids, {
      dryRun: options?.dryRun,
    })
    destroyed += result.destroyed.length
    const remaining = result.failed

    if (options?.dryRun) {
      stillPending += remaining.length
      continue
    }

    const retryCount = (job.retryCount || 0) + 1
    if (remaining.length === 0) {
      const manual = appleRevokeNeedsManualInstructions(job.appleRevoke)
      await AccountDeletionJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: terminalStatus(manual),
            cloudinaryPendingPublicIds: [],
            retryCount,
            completedAt: new Date(),
            lastErrorCode: undefined,
          },
        }
      )
    } else if (retryCount >= ACCOUNT_DELETION_MAX_RETRIES) {
      // Abandon: clear payload so photos are not retained indefinitely in job.
      // Operational: review Cloudinary folder manually if needed.
      abandoned += remaining.length
      const manual = appleRevokeNeedsManualInstructions(job.appleRevoke)
      await AccountDeletionJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: terminalStatus(manual),
            cloudinaryPendingPublicIds: [],
            retryCount,
            completedAt: new Date(),
            lastErrorCode: "cloudinary_abandoned",
          },
        }
      )
    } else {
      stillPending += remaining.length
      await AccountDeletionJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "failed_retryable",
            cloudinaryPendingPublicIds: remaining,
            retryCount,
            nextAttemptAt: new Date(Date.now() + retryCount * 5 * 60_000),
            lastErrorCode: "cloudinary_retry",
          },
        }
      )
    }
  }

  return {
    scanned: jobs.length,
    destroyed,
    stillPending,
    abandoned,
  }
}
