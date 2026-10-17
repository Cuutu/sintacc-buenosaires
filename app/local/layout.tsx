import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Panel del local",
  robots: { index: false, follow: false, nocache: true },
}

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return children
}
