"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type jsPDF from "jspdf"
import { Download, HeartPulse, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { PanelError, PanelPager } from "@/components/dashboard-panel"
import { loadFindings } from "@/components/content/safety-home/findings-data"
import { hoyISO, inicioSemana, semanaIso, sumarDias } from "@/lib/fechas"
import { crearReporteAccidentes, nombreArchivoAccidentes } from "@/lib/reportes-seguridad/accidentes-pdf"
import { crearReporteSafeWalk, nombreArchivoSafeWalk } from "@/lib/reportes-seguridad/safe-walk-pdf"
import { cargarAccidentes, type Accidente } from "@/lib/salud-ocupacional"
import { describeSupabaseError } from "@/lib/supabase/errors"

type Reporte = "safe-walk" | "accidentes"

/** Mismos nombres e íconos que el menú de Seguridad e Higiene. */
const REPORTES: readonly SectionNavItem<Reporte>[] = [
  { id: "safe-walk", label: "Safe Walk", icon: LayoutDashboard },
  { id: "accidentes", label: "Occupational Health", icon: HeartPulse },
]

/**
 * Reportes semanales en PDF (carta) para dirección, gerencia y jefaturas. La vista previa es
 * el mismo PDF que se descarga, generado en el navegador para la semana elegida.
 */
export function ReportesSeguridadPage() {
  const [reporte, setReporte] = useState<Reporte>("safe-walk")
  const [actual] = useState(() => inicioSemana(hoyISO()))
  const [lunes, setLunes] = useState(actual)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [generando, setGenerando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<jsPDF | null>(null)
  const accidentesRef = useRef<Accidente[] | null>(null)
  const solicitudRef = useRef(0)

  const generar = useCallback(async () => {
    const solicitud = ++solicitudRef.current
    setGenerando(true)
    setError(null)
    try {
      let doc: jsPDF
      if (reporte === "safe-walk") {
        const hallazgos = await loadFindings({ desde: lunes, hasta: sumarDias(lunes, 6) })
        doc = await crearReporteSafeWalk(hallazgos, lunes)
      } else {
        // Los accidentes no traen fotos: se cargan una vez y cada semana se filtra en memoria.
        accidentesRef.current ??= await cargarAccidentes()
        doc = await crearReporteAccidentes(accidentesRef.current, lunes)
      }
      if (solicitud !== solicitudRef.current) return
      docRef.current = doc
      setVistaPrevia(URL.createObjectURL(doc.output("blob")))
    } catch (caught) {
      if (solicitud === solicitudRef.current) setError(describeSupabaseError(caught, "No se pudo generar el reporte"))
    } finally {
      if (solicitud === solicitudRef.current) setGenerando(false)
    }
  }, [reporte, lunes])

  useEffect(() => { void generar() }, [generar])
  // Libera el PDF anterior al cambiar de vista previa y el último al salir de la página.
  useEffect(() => () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia) }, [vistaPrevia])

  const descargar = () => {
    docRef.current?.save(reporte === "safe-walk" ? nombreArchivoSafeWalk(lunes) : nombreArchivoAccidentes(lunes))
  }

  return (
    <SectionNavLayout label="Reportes semanales" items={REPORTES} value={reporte} onValueChange={setReporte} fill>
      {/* Desde lg la vista previa toma el alto restante: el main no hace scroll. */}
      <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Una fila: semana a la izquierda, descarga a la derecha. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelPager
            label="Semana"
            previousLabel="Semana anterior"
            nextLabel="Semana siguiente"
            onPrevious={() => setLunes(sumarDias(lunes, -7))}
            onNext={lunes < actual ? () => setLunes(sumarDias(lunes, 7)) : undefined}
            className="whitespace-nowrap"
          >
            Semana {semanaIso(lunes).semana}
          </PanelPager>
          <Button type="button" size="sm" className="touch-target" onClick={descargar} disabled={generando || Boolean(error)} aria-busy={generando || undefined}>
            <Download aria-hidden="true" />Descargar PDF
          </Button>
        </div>

        {error ? (
          <PanelError message={error} onRetry={() => void generar()} />
        ) : (
          <div className="relative overflow-hidden rounded-xl border bg-muted lg:min-h-0 lg:flex-1">
            {vistaPrevia && (
              <iframe key={vistaPrevia} src={vistaPrevia} title="Vista previa del reporte en PDF"
                className="block h-[70dvh] w-full lg:h-full" />
            )}
            {generando && (
              <div role="status" className="absolute inset-0 grid place-items-center bg-muted p-(--card-padding)">
                <span className="sr-only">Generando vista previa…</span>
                <Skeleton aria-hidden="true" className="aspect-[8.5/11] h-full max-h-[70dvh] rounded-md" />
              </div>
            )}
          </div>
        )}
      </div>
    </SectionNavLayout>
  )
}
