"use client"

import { useRouter } from "next/navigation"
import { LoyaltyTeamEditor, type TeamEditorProgram } from "@/components/admin/LoyaltyTeamEditor"

/** Equipo de la tarjeta en el panel del local (encargados y admins): agregar o sacar gente desde el celu. */
export function LocalTeamBlock({ programId, program }: { programId: string; program: TeamEditorProgram }) {
  const router = useRouter()
  return (
    <div className="mt-5">
      <LoyaltyTeamEditor
        program={program}
        endpoint={`/api/local/programas/${programId}/equipo`}
        method="PUT"
        onChanged={() => router.refresh()}
      />
    </div>
  )
}
