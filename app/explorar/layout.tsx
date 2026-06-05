import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Explorar lugares sin gluten - Mapa para celíacos",
  description:
    "Explorá el mapa para celíacos: restaurantes, cafés y panaderías aptas en todo el mundo. Cerca tuyo, mejor valorados y nuevos lugares sin TACC.",
  keywords: [
    "explorar lugares sin gluten",
    "cerca tuyo celíacos",
    "mejor valorados sin TACC",
    "nuevos lugares aptos celíacos",
  ],
  alternates: { canonical: `${BASE_URL}/explorar` },
  openGraph: {
    title: "Explorar lugares sin gluten - Mapa para celÃ­acos",
    description:
      "ExplorÃ¡ el mapa para celÃ­acos: restaurantes, cafÃ©s y panaderÃ­as aptas en todo el mundo.",
    url: `${BASE_URL}/explorar`,
    type: "website",
  },
};

export default function ExplorarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
