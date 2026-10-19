// next/dist/compiled/web-vitals viene sin tipos. Lo usa next/web-vitals por dentro;
// lo importamos directo para cargarlo después del `load` (components/analytics/WebVitalsReporter).
declare module "next/dist/compiled/web-vitals" {
  export type Metric = {
    name: string
    value: number
    delta: number
    id: string
    rating?: "good" | "needs-improvement" | "poor"
    navigationType?: string
  }
  type ReportCallback = (metric: Metric) => void
  type ReportOpts = { reportAllChanges?: boolean }
  export function onCLS(cb: ReportCallback, opts?: ReportOpts): void
  export function onFCP(cb: ReportCallback, opts?: ReportOpts): void
  export function onFID(cb: ReportCallback, opts?: ReportOpts): void
  export function onINP(cb: ReportCallback, opts?: ReportOpts): void
  export function onLCP(cb: ReportCallback, opts?: ReportOpts): void
  export function onTTFB(cb: ReportCallback, opts?: ReportOpts): void
}
