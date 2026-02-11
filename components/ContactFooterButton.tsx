"use client"

import * as React from "react"
import { ContactModal } from "@/components/ContactModal"

export function ContactFooterButton() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:text-foreground transition-colors"
      >
        Contacto
      </button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </>
  )
}
