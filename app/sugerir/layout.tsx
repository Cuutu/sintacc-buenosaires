import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sugerir un lugar",
  description:
    "¿Conocés un lugar sin TACC en Buenos Aires? Sugerilo y ayudá a la comunidad celíaca a descubrir más opciones.",
};

export default function SugerirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
