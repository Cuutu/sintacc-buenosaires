import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorar lugares sin gluten - Mapa para celíacos",
  description:
    "Explorá el mapa para celíacos: restaurantes, cafés y panaderías aptas en todo el mundo. Cerca tuyo, mejor valorados y nuevos lugares sin TACC.",
};

export default function ExplorarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
