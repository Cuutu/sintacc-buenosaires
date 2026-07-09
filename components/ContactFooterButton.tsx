"use client"

import * as React from "react"
import { ContactModal } from "@/components/ContactModal"
import { cn } from "@/lib/utils"

type ContactFooterButtonProps = {
  className?: string
}

export function ContactFooterButton({ className }: ContactFooterButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground transition-colors text-left",
          className,
        )}
      >
        Contacto
      </button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </>
  )
}
