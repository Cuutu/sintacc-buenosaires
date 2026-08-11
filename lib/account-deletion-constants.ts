/** Shared client/server constants for account deletion — no Node secrets. */

export const ACCOUNT_DELETE_CONFIRM = "ELIMINAR"

export type AppleRevokeOutcome =
  | "not_applicable"
  | "revoked"
  | "manual_required"
  | "skipped_no_code"
  | "skipped_no_keys"
  | "failed"

export function appleRevokeNeedsManualInstructions(
  outcome: AppleRevokeOutcome
): boolean {
  return (
    outcome === "manual_required" ||
    outcome === "skipped_no_code" ||
    outcome === "skipped_no_keys" ||
    outcome === "failed"
  )
}
