import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";
import { SuggestPageShell } from "@/components/forms/SuggestPageShell";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Sugerir un lugar",
  description:
    "¿Conocés un lugar sin TACC? Sugerilo y ayudá a la comunidad celíaca a descubrir más opciones en todo el mundo.",
  keywords: [
    "agregar lugar sin TACC",
    "sugerir restaurante celíaco",
    "comunidad celíaca",
    "agregar lugar apto celíacos",
  ],
  alternates: { canonical: `${BASE_URL}/sugerir` },
};

export default function SugerirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuggestPageShell
      kicker="sumá un lugar al mapa"
      title="Sugerir un lugar"
      intro="Lo revisamos antes de publicarlo. Con el link alcanza: el resto lo completamos nosotros."
    >
      {children}
    </SuggestPageShell>
  );
}
