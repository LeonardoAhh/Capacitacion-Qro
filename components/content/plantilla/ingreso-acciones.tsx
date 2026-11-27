"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateEmployeeDialog } from "@/components/content/create-employee-dialog"
import type { NuevoIngreso } from "@/lib/hooks"

/** Botón cuadrado con solo el ícono cuando la barra es angosta. */
export const SOLO_ICONO = "@max-3xl:w-(--control-height) @max-3xl:px-0"
const TEXTO = "hidden @3xl:inline"

interface IngresoAccionesProps {
  saving: boolean
  onCreate: (data: Omit<NuevoIngreso, "id" | "created_at" | "updated_at">) => Promise<boolean>
}

/** Alta de empleados desde la barra de acciones de Plantilla. */
export function IngresoAcciones({ saving, onCreate }: IngresoAccionesProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <Button size="sm" className={SOLO_ICONO} onClick={() => setAbierto(true)} aria-label="Nuevo empleado">
        <UserPlus aria-hidden="true" />
        <span className={TEXTO}>Nuevo empleado</span>
      </Button>

      <CreateEmployeeDialog
        open={abierto}
        saving={saving}
        onClose={() => setAbierto(false)}
        onCreate={async (data) => { if (await onCreate(data)) setAbierto(false) }}
      />
    </>
  )
}
