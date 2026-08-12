"use client"

import Link from "next/link"
import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics"

type TrackAnalyticsClickProps = Omit<ComponentPropsWithoutRef<typeof Link>, "onClick"> & {
  event: AnalyticsEvent
  properties?: Record<string, string | number | boolean>
}

/**
 * Link que dispara un evento de analítica una vez por clic.
 * Compatible con Button asChild (forwardRef).
 */
export const TrackAnalyticsClick = forwardRef<HTMLAnchorElement, TrackAnalyticsClickProps>(
  function TrackAnalyticsClick({ event, properties, ...props }, ref) {
    return (
      <Link
        ref={ref}
        {...props}
        onClick={() => {
          trackEvent(event, properties)
        }}
      />
    )
  }
)
