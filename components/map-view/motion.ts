export const SHORT_SPRING = {
  stiffness: 380,
  damping: 34,
  mass: 1,
}

/** px/s — flick past closest snap */
export const FLICK_VELOCITY = 640

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
