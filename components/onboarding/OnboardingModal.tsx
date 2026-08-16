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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { isNativeApp } from "@/lib/native-app"
import { isPrivateListPath } from "@/lib/lists/is-private-list-path"
import { usePathname } from "next/navigation"

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
    title: "Comer sin TACC, sin vueltas",
    description:
      "CeliMap es el mapa colaborativo para celíacos. Lugares aportados por la comunidad, con reseñas cuando existen.",
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
      "Activá tu ubicación en el mapa y CeliMap te muestra opciones sin TACC a tu alrededor.",
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
      "Marcá «100% sin gluten» si querés máxima seguridad",
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
            i <= current ? "bg-[#C85A2E]" : "bg-[#E8E1D6]"
          )}
        />
      ))}
    </div>
  )
}

function WelcomeVisual() {
  return (
    <div className="relative mx-auto flex h-36 w-full max-w-[280px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] px-6 py-5">
        <Image
          src="/map/pin-dedicated.png"
          alt=""
          width={56}
          height={72}
          className="h-14 w-auto object-contain"
        />
        <p className="font-serif text-sm italic text-[#C85A2E]">tu mapa sin gluten</p>
      </div>
    </div>
  )
}

function LocationVisual() {
  return (
    <div className="relative mx-auto h-36 w-full max-w-[280px] overflow-hidden rounded-[20px] border border-[#E8E1D6] bg-[#F8F5EF]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, #2D4A34 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C85A2E]/35" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-[#C85A2E]" />
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl border border-[#E8E1D6] bg-[#FDFBF7] px-3 py-2">
        <span className="text-xs text-[#5F6B63]">3 lugares cerca</span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#C85A2E] px-2 py-1 text-[10px] font-semibold text-[#F8F5EF]">
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
    { label: "100% sin gluten", active: true, accent: true },
  ]
  return (
    <div className="mx-auto flex h-36 w-full max-w-[280px] flex-col justify-center gap-3 rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] p-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <span
            key={f.label}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium",
              f.active
                ? f.accent
                  ? "border-[#C85A2E]/40 bg-[#C85A2E]/10 text-[#C85A2E]"
                  : "border-[#2D4A34]/20 bg-[#2D4A34]/8 text-[#2D4A34]"
                : "border-[#E8E1D6] bg-[#F8F5EF] text-[#5F6B63]"
            )}
          >
            {f.label}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { name: "Panadería GF", badge: "100%", rating: "4.8" },
          { name: "Café sin TACC", badge: "Opciones", rating: "4.5" },
        ].map((place) => (
          <div
            key={place.name}
            className="flex items-center justify-between rounded-xl border border-[#E8E1D6] bg-[#F8F5EF] px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 shrink-0 text-[#C85A2E]" />
              <span className="text-[11px] font-medium text-[#2D4A34]">{place.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded px-1 py-0.5 text-[9px] font-semibold text-[#1F4D35]">
                {place.badge}
              </span>
              <span className="text-[10px] text-[#5F6B63]">★ {place.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SaveVisual() {
  return (
    <div className="mx-auto flex h-36 w-full max-w-[280px] flex-col justify-center rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] p-4">
      <div className="rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#2D4A34]">Bröd · Panadería</p>
            <p className="text-[10px] text-[#5F6B63]">Palermo, CABA</p>
          </div>
          <Heart className="h-5 w-5 shrink-0 fill-[#C85A2E] text-[#C85A2E]" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#5F6B63]">
          <Shield className="h-3 w-3 text-[#1F4D35]" />
          100% sin gluten · 12 reseñas
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-[#5F6B63]">Guardado en tus favoritos</p>
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
  const pathname = usePathname()
  const onPrivateList = isPrivateListPath(pathname)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "back">("forward")

  useEffect(() => {
    if (onPrivateList) {
      setOpen(false)
      return
    }
    try {
      if (isNativeApp()) {
        localStorage.setItem(STORAGE_KEY, "1")
        return
      }
      if (localStorage.getItem(STORAGE_KEY) === "1") return
      const timer = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(timer)
    } catch {
      // localStorage bloqueado
    }
  }, [onPrivateList])

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

  if (onPrivateList) return null

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
      <DialogContent className="max-w-[400px] gap-0 overflow-hidden border-[#E8E1D6] bg-[#F8F5EF] p-0 text-[#2D4A34] shadow-[0_24px_48px_-24px_rgba(31,77,53,0.35)] sm:rounded-[24px]">
        <DialogTitle className="sr-only">Bienvenido a CeliMap</DialogTitle>

        <div className="relative border-b border-[#E8E1D6] px-5 pb-4 pt-5 pr-12">
          <div className="relative mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F4D35]/8">
              <Icon className="h-4 w-4 text-[#1F4D35]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C85A2E]">
                {current.label}
              </p>
              <p className="text-xs text-[#5F6B63]">
                Paso {step + 1} de {STEPS.length}
              </p>
            </div>
          </div>
          <StepProgress current={step} total={STEPS.length} />
        </div>

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

          <h3 className="mb-2 font-display text-lg font-bold tracking-tight text-[#1F4D35]">
            {current.title}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-[#5F6B63]">{current.description}</p>

          <ul className="space-y-2 rounded-[16px] border border-[#E8E1D6] bg-[#FDFBF7] p-3">
            {current.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-[#2D4A34]">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C85A2E]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {isLast ? (
          <div className="border-t border-[#E8E1D6] bg-[#F8F5EF] p-4">
            <Link
              href="/mapa"
              onClick={finish}
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#C85A2E] text-base font-semibold text-white shadow-[0_8px_18px_-10px_rgba(200,90,46,0.5)] hover:bg-[#BE552C]"
            >
              <MapPin className="h-4 w-4" />
              Abrir el mapa
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-[#E8E1D6] bg-[#F8F5EF] px-5 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              aria-label="Paso anterior"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E1D6] bg-[#FDFBF7] text-[#2D4A34] transition-colors",
                isFirst
                  ? "pointer-events-none opacity-0"
                  : "hover:border-[#2D4A34]/25 hover:bg-[#F3EEE5]"
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
                    i === step ? "w-5 bg-[#C85A2E]" : "w-1.5 bg-[#E8E1D6]"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente paso"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C85A2E] text-white transition-colors hover:bg-[#BE552C]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
