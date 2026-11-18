"use client"

import { useCallback, useRef, useState } from "react"
import { cargarCatalogoCursos, type CursoCatalogo } from "@/lib/plan-anual"

type Estado = "idle" | "loading" | "ready" | "error"

/**
 * Catálogo de cursos bajo demanda: se consulta la primera vez que se pide
 * (al abrir un diálogo de captura) y se reutiliza mientras la página siga montada.
 */
export function useCatalogoCursos() {
  const [cursos, setCursos] = useState<CursoCatalogo[]>([])
  const [estado, setEstado] = useState<Estado>("idle")
  const request = useRef<Promise<void> | null>(null)

  const cargar = useCallback(() => {
    if (request.current) return
    setEstado("loading")
    request.current = cargarCatalogoCursos().then(data => {
      setCursos(data)
      setEstado("ready")
    }).catch(() => {
      // Permite reintentar la próxima vez que se abra el diálogo.
      request.current = null
      setEstado("error")
    })
  }, [])

  return {
    cursos,
    loading: estado === "idle" || estado === "loading",
    error: estado === "error" ? "No se pudo cargar el catálogo de cursos." : null,
    cargar,
  }
}
