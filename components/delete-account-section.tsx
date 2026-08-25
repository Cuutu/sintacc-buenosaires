"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ACCOUNT_DELETE_CONFIRM } from "@/lib/account-deletion-constants"
import {
  clearNativeSocialSessions,
  isAppleSignInAvailable,
  NativeAppleSignInError,
  reauthenticateAppleForAccountDeletion,
} from "@/lib/native-sign-in"
import { FetchApiError, fetchApi } from "@/lib/fetchApi"

type DeleteResponse = {
  ok: boolean
  appleRevoke?: string
  appleManualInstructions?: boolean
  manualAppleRevokeSteps?: string[]
  cloudinaryPending?: number
  error?: string
  code?: string
}

type Props = {
  /** True when the signed-in user has an Apple-linked account (appleSub). */
  needsAppleReauth: boolean
}

export function DeleteAccountSection({ needsAppleReauth }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualSteps, setManualSteps] = useState<string[] | null>(null)

  const canSubmit =
    confirmText.trim() === ACCOUNT_DELETE_CONFIRM && !loading

  async function runDeletion() {
    setError(null)
    setManualSteps(null)
    setLoading(true)

    try {
      let apple:
        | {
            challengeId: string
            idToken: string
            authorizationCode?: string
          }
        | undefined

      if (needsAppleReauth && isAppleSignInAvailable()) {
        try {
          apple = await reauthenticateAppleForAccountDeletion()
        } catch (err) {
          if (err instanceof NativeAppleSignInError && err.code === "cancelled") {
            setLoading(false)
            return
          }
          // Continue without Apple revoke — server will return manual instructions.
          apple = undefined
        }
      }

      const data = await fetchApi<DeleteResponse>("/api/account", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: ACCOUNT_DELETE_CONFIRM,
          ...(apple ? { apple } : {}),
        }),
      })

      if (data.appleManualInstructions && data.manualAppleRevokeSteps?.length) {
        setManualSteps(data.manualAppleRevokeSteps)
      }

      await clearNativeSocialSessions()
      await signOut({ redirect: false })

      if (data.appleManualInstructions && data.manualAppleRevokeSteps?.length) {
        // Brief pause so user can read steps before redirect — keep dialog open with success copy
        setLoading(false)
        setError(null)
        setManualSteps(data.manualAppleRevokeSteps)
        // Auto-redirect shortly
        window.setTimeout(() => {
          router.replace("/")
          router.refresh()
        }, 4000)
        return
      }

      setOpen(false)
      router.replace("/")
      router.refresh()
    } catch (err) {
      const message =
        err instanceof FetchApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo eliminar la cuenta"
      setError(message)
      setLoading(false)
    }
  }

  return (
    <section className="mt-8" aria-labelledby="delete-account-heading">
      <h2
        id="delete-account-heading"
        className="text-lg font-semibold text-foreground mb-2"
      >
        Eliminar cuenta
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Podés borrar tu cuenta y tus datos asociados desde la app, sin escribir
        a soporte.
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 min-h-[44px] justify-start gap-3 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setOpen(true)
          setError(null)
          setConfirmText("")
          setManualSteps(null)
        }}
        data-testid="delete-account-open"
      >
        <Trash2 className="h-5 w-5" />
        Eliminar mi cuenta
      </Button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="max-w-md" data-testid="delete-account-dialog">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>Esta acción es permanente. Se eliminarán:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tu perfil</li>
                  <li>Favoritos</li>
                  <li>Listas (públicas y privadas)</li>
                  <li>Reseñas y reportes</li>
                  <li>Fotos que subiste</li>
                  <li>Sugerencias y mensajes de contacto asociados</li>
                </ul>
                <p>
                  Los lugares del mapa público que ya fueron publicados se
                  conservan (sin tu identidad).
                </p>
                {needsAppleReauth && isAppleSignInAvailable() && (
                  <p>
                    Para revocar Sign in with Apple, te pediremos confirmar con
                    Apple una vez más.
                  </p>
                )}
                {needsAppleReauth && !isAppleSignInAvailable() && (
                  <p>
                    En la web no podemos revocar Apple automáticamente. Tras
                    borrar tus datos en CeliMap, podés revocar el acceso desde
                    Ajustes de Apple.
                  </p>
                )}
                <p>
                  Escribí{" "}
                  <span className="font-semibold text-foreground">
                    {ACCOUNT_DELETE_CONFIRM}
                  </span>{" "}
                  para confirmar.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <label className="block text-sm">
            <span className="sr-only">Confirmación</span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              data-testid="delete-account-confirm-input"
              placeholder={ACCOUNT_DELETE_CONFIRM}
            />
          </label>

          {error && (
            <p
              className="text-sm text-destructive"
              role="alert"
              data-testid="delete-account-error"
            >
              {error}
            </p>
          )}

          {manualSteps && (
            <div
              className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-2"
              data-testid="delete-account-apple-manual"
            >
              <p className="font-medium text-foreground">
                Cuenta eliminada en CeliMap. Revocá Apple manualmente:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                {manualSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="text-muted-foreground">Redirigiendo al inicio…</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => setOpen(false)}
              data-testid="delete-account-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canSubmit || Boolean(manualSteps)}
              onClick={() => void runDeletion()}
              data-testid="delete-account-submit"
            >
              {loading ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
