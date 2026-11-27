"use client"

import { useEffect, useState } from "react"
import { notify } from "@/lib/notify"
import { fetchAllRows } from "@/lib/supabase/fetchAll"

export interface EmpleadoTE {
  nombre: string
  puesto: string | null
}

/**
 * Toda la plantilla por número, cargada una vez: cada número capturado se resuelve al instante,
 * sin esperar a la red.
 */
export function useEmpleadosPorNumero() {
  const [empleados, setEmpleados] = useState<ReadonlyMap<string, EmpleadoTE> | null>(null)

  useEffect(() => {
    let activo = true
    fetchAllRows<{ numero: string | null; nombre: string; puesto: string | null }>("employees", "numero, nombre, puesto")
      .then(filas => {
        if (!activo) return
        setEmpleados(new Map(filas.flatMap(fila => fila.numero?.trim() ? [[fila.numero.trim(), { nombre: fila.nombre, puesto: fila.puesto }] as const] : [])))
      })
      .catch(() => { if (activo) notify.error("No se pudo cargar la plantilla") })
    return () => { activo = false }
  }, [])

  return empleados
}
