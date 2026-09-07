export const SHORT_SPRING = {
  stiffness: 380,
  damping: 34,
  mass: 1,
}

/** px/s — flick past closest snap */
export const FLICK_VELOCITY = 640

export const MOTION_MS = {
  fast: 180,
  base: 240,
  sheet: 360,
  close: 280,
  pan: 600,
  press: 80,
  filterFade: 160,
  listOut: 120,
  listIn: 180,
  queryChip: 200,
  reduce: 120,
} as const

export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"
export const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)"

export const STAGGER_PIN_MS = 24
export const PIN_STAGGER_MAX = 12

/** Mapbox `easing` callback — ease.out */
export function easeOutUnit(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) * (1 - x) * (1 - x)
}

export function animateSpring(options: {
  from: number
  to: number
  velocity?: number
  reduceMotion: boolean
  stiffness?: number
  damping?: number
  mass?: number
  onUpdate: (value: number) => void
  onComplete?: () => void
}): () => void {
  const {
    from,
    to,
    velocity = 0,
    reduceMotion,
    stiffness = SHORT_SPRING.stiffness,
    damping = SHORT_SPRING.damping,
    mass = SHORT_SPRING.mass,
    onUpdate,
    onComplete,
  } = options

  if (reduceMotion) {
    onUpdate(to)
    onComplete?.()
    return () => {}
  }

  let current = from
  let vel = velocity
  let last = performance.now()
  let frame = 0
  let stopped = false

  const tick = (now: number) => {
    if (stopped) return
    const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000))
    last = now
    const acc = (-stiffness * (current - to) + -damping * vel) / mass
    vel += acc * dt
    current += vel * dt

    if (Math.abs(current - to) < 0.5 && Math.abs(vel) < 18) {
      onUpdate(to)
      onComplete?.()
      return
    }

    onUpdate(current)
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}

export function animateEase(options: {
  from: number
  to: number
  duration: number
  reduceMotion: boolean
  onUpdate: (value: number) => void
  onComplete?: () => void
}): () => void {
  const { from, to, duration, reduceMotion, onUpdate, onComplete } = options
  if (reduceMotion || duration <= 0) {
    onUpdate(to)
    onComplete?.()
    return () => {}
  }

  const start = performance.now()
  let frame = 0
  let stopped = false

  const tick = (now: number) => {
    if (stopped) return
    const progress = Math.min(1, (now - start) / duration)
    onUpdate(from + (to - from) * easeOutUnit(progress))
    if (progress < 1) {
      frame = requestAnimationFrame(tick)
      return
    }
    onComplete?.()
  }

  frame = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}
