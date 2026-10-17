"use client"

import { Printer } from "lucide-react"

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-terracotta-strong px-5 font-semibold text-white"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  )
}
