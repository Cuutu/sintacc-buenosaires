export default function MapaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-[calc(100dvh-4rem)] md:h-[calc(100vh-4rem)] -mb-[calc(5rem+env(safe-area-inset-bottom))] md:mb-0 min-h-0 overflow-hidden">
      {children}
    </div>
  )
}
