type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type Listener = (canInstall: boolean) => void

let deferred: BeforeInstallPromptEvent | null = null
let captured = false
const listeners = new Set<Listener>()

function notify() {
  const can = deferred != null
  listeners.forEach((fn) => fn(can))
}

export function initPwaInstallCapture() {
  if (typeof window === "undefined" || captured) return
  captured = true
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    notify()
  })
}

export function canPromptPwaInstall() {
  return deferred != null
}

export function subscribePwaInstall(fn: Listener) {
  listeners.add(fn)
  fn(deferred != null)
  return () => {
    listeners.delete(fn)
  }
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable"
  try {
    await deferred.prompt()
    const choice = await deferred.userChoice
    deferred = null
    notify()
    return choice.outcome
  } catch {
    deferred = null
    notify()
    return "dismissed"
  }
}

export const INSTALL_REQUEST_EVENT = "celimap-request-install"

export function requestInstallPrompt() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(INSTALL_REQUEST_EVENT))
}
