import { cn } from "@/lib/utils"
import styles from "./apple-sign-in-button.module.css"

/**
 * Official Apple logo silhouette required by Sign in with Apple HIG.
 * Not a generic fruit icon. Use only on the SIWA button.
 */
function AppleLogo() {
  return (
    <svg
      className={styles.logo}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-testid="apple-signin-logo"
    >
      <path d="M16.365 12.49c-.022-2.355 1.926-3.482 2.014-3.533-1.097-1.605-2.805-1.825-3.41-1.85-1.45-.147-2.833.854-3.57.854-.736 0-1.876-.833-3.087-.81-1.588.024-3.05.922-3.866 2.342-1.65 2.86-.422 7.09 1.185 9.41.786 1.136 1.724 2.41 2.954 2.365 1.185-.047 1.633-.766 3.066-.766 1.433 0 1.836.766 3.087.742 1.276-.024 2.085-1.157 2.866-2.3.905-1.322 1.277-2.603 1.3-2.67-.028-.013-2.49-.955-2.529-3.784zm-2.373-6.99c.65-.787 1.089-1.88.968-2.97-.935.038-2.068.623-2.74 1.407-.602.693-1.13 1.8-.987 2.86 1.043.081 2.11-.53 2.759-1.297z" />
    </svg>
  )
}

interface AppleSignInButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export function AppleSignInButton({
  onClick,
  disabled = false,
  loading = false,
}: AppleSignInButtonProps) {
  const busy = disabled || loading
  return (
    <button
      type="button"
      className={cn(styles.button, "login-oauth-btn")}
      onClick={onClick}
      disabled={busy}
      aria-label="Continuar con Apple"
      aria-busy={loading || undefined}
      data-testid="apple-signin-button"
      data-provider="apple"
      data-apple-signin="true"
    >
      <span className={styles.label}>
        <AppleLogo />
        <span className={styles.title}>
          {loading ? "Conectando…" : "Continuar con Apple"}
        </span>
      </span>
    </button>
  )
}
