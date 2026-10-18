"use client"

import { useReportWebVitals } from "next/web-vitals"
import { reportWebVital } from "@/lib/web-vitals-client"

/** Manda LCP, INP, CLS, FCP y TTFB como eventos first-party (`web_vital`). */
export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital)
  return null
}
