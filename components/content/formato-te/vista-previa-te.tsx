"use client"

import { useEffect, useRef, useState } from "react"
import type { FilaTE } from "@/lib/formato-te"
import { FormatoTEPrint } from "./formato-te-print"

/** Ancho de la hoja carta horizontal (279.4 mm) en px CSS. */
const ANCHO_HOJA_PX = (279.4 / 25.4) * 96

/**
 * Las hojas tal como se imprimen, reducidas al ancho disponible. Es la misma área que manda
 * a la impresora; el zoom solo aplica en pantalla.
 */
export function VistaPreviaTE({ filas, motivos }: { filas: readonly FilaTE[]; motivos: string }) {
  const marcoRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    const marco = marcoRef.current
    if (!marco) return
    const observer = new ResizeObserver(([entrada]) => setEscala(Math.min(1, entrada.contentRect.width / ANCHO_HOJA_PX)))
    observer.observe(marco)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={marcoRef} className="overflow-x-hidden overflow-y-auto rounded-xl border bg-muted p-(--card-padding) 2xl:min-h-0 2xl:flex-1">
      <FormatoTEPrint filas={filas} motivos={motivos} className="w-fit shadow-(--floating-shadow)" style={{ zoom: escala }} />
    </div>
  )
}
