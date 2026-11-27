"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Checkbox } from "@/components/ui/checkbox"
import { ChoiceToggle } from "@/components/ui/choice-toggle"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import RecontratacionPrint, { type RecontratacionPrintData } from "@/components/content/recontratacion-print"
import { useRecontratacion } from "@/lib/hooks/useRecontratacion"
import { notify } from "@/lib/notify"
import { OPCIONES_IMPRESION_INICIALES, RESPUESTAS_FORMATO, textoFormato, type OpcionesImpresion } from "@/lib/recontratacion-impresion"

/** Espera a que carguen las imágenes del formato (logo) para no imprimir la hoja sin ellas. */
async function imagenesListas(root: HTMLElement) {
  await Promise.all([...root.querySelectorAll("img")].map(img => img.complete ? null : img.decode().catch(() => null)))
}

/**
 * Opciones del formato e impresión directa (desde el listado o el detalle): al confirmar,
 * el formato se arma fuera de pantalla (solo visible al imprimir, .print-area) y se abre el
 * diálogo de impresión del navegador; al cerrarlo, también se cierra este modal.
 */
export function RecontratacionPrintDialog({ numero, nombre, data, onClose }: {
  numero: string
  nombre: string
  /** Si ya está cargado (detalle), no se vuelve a consultar. */
  data?: RecontratacionPrintData
  onClose: () => void
}) {
  const { fetchByNumero } = useRecontratacion()
  const [opciones, setOpciones] = useState<OpcionesImpresion>(OPCIONES_IMPRESION_INICIALES)
  const [documento, setDocumento] = useState<RecontratacionPrintData | null>(null)
  const [preparando, setPreparando] = useState(false)
  const hojaRef = useRef<HTMLDivElement>(null)
  const cambiar = (cambios: Partial<OpcionesImpresion>) => setOpciones(current => ({ ...current, ...cambios }))

  // Con el formato ya montado: imprime y, al cerrar la ventana de impresión, termina.
  useEffect(() => {
    if (!documento || !hojaRef.current) return
    let activo = true
    void imagenesListas(hojaRef.current).then(() => {
      if (!activo) return
      window.addEventListener("afterprint", onClose, { once: true })
      window.print()
    })
    return () => {
      activo = false
      window.removeEventListener("afterprint", onClose)
    }
  }, [documento, onClose])

  async function imprimir() {
    if (preparando) return
    setPreparando(true)
    const cargado = data ?? await fetchByNumero(numero)
    if (!cargado) {
      notify.error("No se pudo cargar el formato")
      setPreparando(false)
      return
    }
    setDocumento(cargado)
  }

  return (
    <>
      <ResponsiveShell open={!documento} onClose={onClose} size="sm" title="Imprimir formato">
        <ModalHeader title="Imprimir formato" subtitle={`${nombre} · No. ${numero}`} onClose={onClose} />
        <div className="grid min-h-0 gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 dense:gap-4 dense:px-4 dense:py-4">
          <ChoiceToggle id="reco-rg" label="RG-REC-048 requisitado y entregado" value={opciones.rg} options={RESPUESTAS_FORMATO}
            onChange={rg => cambiar({ rg })} />
          <ChoiceToggle id="reco-autoriza" label="¿Autoriza contrato indeterminado?" value={opciones.autoriza} options={RESPUESTAS_FORMATO}
            onChange={autoriza => cambiar({ autoriza })} />
          <label className="flex min-h-(--control-height) cursor-pointer items-center gap-3 text-body-md text-foreground">
            <Checkbox checked={opciones.observacion} onCheckedChange={checked => cambiar({ observacion: checked === true })} />
            Mostrar «El área no entregó» en evaluaciones sin calificación
          </label>
        </div>
        <ModalFooter onCancel={onClose} onConfirm={() => void imprimir()} saving={preparando} confirmLabel="Imprimir" />
      </ResponsiveShell>

      {/* En <body> y oculto en pantalla: solo lo ve la impresión (reglas de .print-area en globals.css). */}
      {documento && createPortal(
        <div ref={hojaRef} className="hidden print:block">
          <RecontratacionPrint data={documento} mostrarObservacionAreaNoEntrego={opciones.observacion}
            rgEstado={textoFormato(opciones.rg)} autorizacionContrato={textoFormato(opciones.autoriza)} />
        </div>,
        document.body,
      )}
    </>
  )
}
