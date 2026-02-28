import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lista | Celimap",
}

export default function ListaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
