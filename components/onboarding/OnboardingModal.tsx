"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  MapPin,
  Heart,
  Navigation,
  Shield,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

const STORAGE_KEY = "celimap_onboarded"

type StepId = "welcome" | "location" | "explore" | "save"

type OnboardingStep = {
  id: StepId
  icon: typeof MapPin
  label: string
  title: string
  description: string
  tips: string[]
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: Sparkles,
    label: "Bienvenida",
    title: "Comer sin tacc, sin vueltas",
    description:
      "Celimap es el mapa colaborativo para celíacos. Lugares verificados por la comunidad, con reseñas reales.",
    tips: [
      "+400 lugares en Argentina",
      "Gratis para explorar el mapa",
      "Actualizado por usuarios como vos",
    ],
  },
  {
    id: "location",
    icon: Navigation,
    label: "Ubicación",
    title: "Encontrá lugares cerca tuyo",
    description:
      "Activá tu ubicación en el mapa y Celimap te muestra opciones sin tacc a tu alrededor.",
    tips: [
      "Tocá el ícono de ubicación en el mapa",
      "Aceptá el permiso cuando el navegador lo pida",
      "Los pines se actualizan según dónde estés",
    ],
  },
  {
    id: "explore",
    icon: Filter,
    label: "Filtros",
    title: "Filtrá lo que necesitás",
    description:
      "No todos los lugares son iguales. Elegí tipo de local y nivel de seguridad antes de salir.",
    tips: [
      "Restaurantes, cafés, panaderías y más",
      "Marcá «100% sin tacc» si querés máxima seguridad",
      "Leé reseñas de otros celíacos",
    ],
  },
  {
    id: "save",
    icon: Heart,
    label: "Favoritos",
    title: "Guardá tus lugares",
    description:
      "Con Google podés guardar favoritos y armar tu lista personal para la próxima salida.",
    tips: [
      "Iniciá sesión con tu cuenta Google",
      "Tocá el corazón en cualquier lugar",
      "Accedé desde Perfil o Favoritos",
    ],
  },
]

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-300",
            i <= current ? "bg-primary" : "bg-white/10"
          )}
        />
      ))}
    </div>
  )
}

function WelcomeVisual() {
  return (
    <div className="relative mx-auto flex h-36 w-full max-w-[280px] items-center justify-center">
      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
      <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-card/80 px-6 py-5 backdrop-blur-sm">
        <Image
          src="/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="rounded-xl shadow-lg shadow-primary/20"
        />
        <div className="flex gap-2">
          {["🍽️", "☕", "🥐"].map((emoji) => (
            <span
              key={emoji}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm"
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function LocationVisual() {
  return (
    <div className="relative mx-auto h-36 w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--primary) / 0.4) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-primary/30 bg-card/90 px-3 py-2 backdrop-blur-sm">
        <span className="text-xs text-muted-foreground">3 lugares cerca</span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
          <Navigation className="h-3 w-3" />
          Cerca mío
        </span>
      </div>
    </div>
  )
}

function ExploreVisual() {
  const filters = [
    { label: "Restaurantes", active: true },
    { label: "Cafés", active: false },
    { label: "100% sin tacc", active: true, accent: true },
  ]
  return (
    <div className="mx-auto flex h-36 w-full max-w-[280px] flex-col justify-center gap-3 rounded-2xl border border-white/10 bg-card/50 p-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <span
            key={f.label}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors",
              f.active
                ? f.accent
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/20 bg-white/10 text-foreground"
                : "border-white/8 bg-transparent text-muted-foreground"
            )}
          >
            {f.label}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { name: "Panadería GF", badge: "100%", rating: "4.8" },
          { name: "Café sin tacc", badge: "Opciones", rating: "4.5" },
        ].map((place) => (
          <div
            key={place.name}
            className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[11px] font-medium">{place.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded px-1 py-0.5 text-[9px] bg-primary/10 text-primary">
                {place.badge}
              </span>
              <span className="text-[10px] text-muted-foreground">★ {place.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SaveVisual() {
  return (
    <div className="mx-auto flex h-36 w-full max-w-[280px] flex-col justify-center rounded-2xl border border-white/10 bg-card/50 p-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold">Bröd · Panadería</p>
            <p className="text-[10px] text-muted-foreground">Palermo, CABA</p>
          </div>
          <Heart className="h-5 w-5 fill-primary text-primary shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          100% sin tacc · 12 reseñas
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Guardado en tus favoritos
      </p>
    </div>
  )
}

function StepVisual({ stepId }: { stepId: StepId }) {
  switch (stepId) {
    case "welcome":
      return <WelcomeVisual />
    case "location":
      return <LocationVisual />
    case "explore":
      return <ExploreVisual />
    case "save":
      return <SaveVisual />
  }
}

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "back">("forward")

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return
      const timer = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(timer)
    } catch {
      // localStorage bloqueado
    }
  }, [])

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
    trackEvent("onboarding_complete")
    setOpen(false)
  }, [])

  const goNext = () => {
    setDirection("forward")
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setDirection("back")
    setStep((s) => Math.max(s - 1, 0))
  }

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  const handleOpenChange = (next: boolean) => {
    if (!next) finish()
    else setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 overflow-hidden border-primary/15 p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Bienvenido a Celimap</DialogTitle>

        {/* Header */}
        <div className="relative overflow-hidden border-b border-white/8 px-5 pb-4 pt-5 pr-12">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                {current.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Paso {step + 1} de {STEPS.length}
              </p>
            </div>
          </div>
          <StepProgress current={step} total={STEPS.length} />
        </div>

        {/* Body */}
        <div
          key={current.id}
          className={cn(
            "px-5 py-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
            direction === "forward"
              ? "motion-safe:slide-in-from-right-4"
              : "motion-safe:slide-in-from-left-4"
          )}
        >
          <div className="mb-5">
            <StepVisual stepId={current.id} />
          </div>

          <h3 className="mb-2 text-lg font-bold tracking-tight">{current.title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>

          <ul className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            {current.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        {isLast ? (
          <div className="border-t border-white/8 bg-card/30 p-4">
            <Button asChild className="min-h-[48px] w-full gap-2 shadow-lg shadow-primary/20">
              <Link href="/mapa" onClick={finish}>
                <MapPin className="h-4 w-4" />
                Abrir el mapa
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-white/8 bg-card/30 px-5 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              aria-label="Paso anterior"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors",
                isFirst
                  ? "pointer-events-none opacity-0"
                  : "hover:border-primary/30 hover:bg-primary/10"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-primary" : "w-1.5 bg-white/15"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente paso"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary transition-colors hover:bg-primary/25"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
