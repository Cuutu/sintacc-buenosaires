#!/usr/bin/env tsx
/**
 * Operational: retry Cloudinary cleanup for AccountDeletionJob.
 *
 * Usage:
 *   npx tsx scripts/process-account-deletion-pending.ts --dry-run
 *   npx tsx scripts/process-account-deletion-pending.ts --apply
 *
 * Who: operator with prod MONGODB_URI + Cloudinary env (Vercel CLI / secure shell).
 * How often: after deletions that report cloudinaryPending, or weekly.
 * Does NOT create external workers. Does NOT print public_ids or PII.
 */

import { retryPendingCloudinaryCleanups } from "@/lib/account-deletion"

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes("--apply")
  const dryRun = !apply || args.includes("--dry-run")

  if (!apply && !args.includes("--dry-run")) {
    console.log(
      "Pass --dry-run (default) or --apply. Refusing to mutate without --apply."
    )
  }

  const result = await retryPendingCloudinaryCleanups({
    dryRun: dryRun || !apply,
    limit: 50,
  })

  console.log(
    JSON.stringify({
      mode: apply && !dryRun ? "apply" : "dry-run",
      scanned: result.scanned,
      destroyed: result.destroyed,
      stillPending: result.stillPending,
      abandoned: result.abandoned,
    })
  )
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      error: "process_failed",
      code: err instanceof Error ? err.name : "unknown",
    })
  )
  process.exit(1)
})
