"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDiaCompleto, MonthCalendar, type CalendarEvent } from "@/components/ui/month-calendar"
import { DETAIL_SIDE_QUERY } from "@/components/ui/side-detail-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { hoyISO } from "@/lib/fechas"
import { useRole } from "@/lib/hooks"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { notify } from "@/lib/notify"
import {
  actualizarAccidente, cargarAccidentes, crearAccidente, eliminarAccidente, enRacha, marcadorAccidente, pendientesSeguimiento, racha, resumenMes, TONO_RACHA,
  type Accidente, type DatosAccidente,
} from "@/lib/salud-ocupacional"
import { AccidenteDialog } from "./accidente-dialog"
import { AccidentesDetalle } from "./accidentes-detalle"
import { IndicadoresAccidentes } from "./indicadores-accidentes"

/** Modal abierto: alta (con el día propuesto) o edición de un accidente. */
type Dialogo = { modo: "crear"; fecha: string } | { modo: "editar"; accidente: Accidente } | null

/**
 * Occupational Health: accidentes en planta sobre un calendario sin saturar (un ícono
 * de color por accidente y la racha pintada) con sus indicadores al lado. Un día con
 * accidentes abre su detalle en lugar del calendario.
 */
export function SaludOcupacionalPage() {
  const hoy = hoyISO()
  const [month, setMonth] = useState(hoy)
  const [selected, setSelected] = useState(hoy)
  const [detalle, setDetalle] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailSide = useMediaQuery(DETAIL_SIDE_QUERY)
  const { canManageSafety } = useRole()
  const [accidentes, setAccidentes] = useState<Accidente[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    cargarAccidentes()
      .then(rows => { if (active) setAccidentes(rows) })
      .catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  // Sin datos confiables, la racha y los indicadores no se muestran.
  const listo = !loading && !loadError

  const rachaActual = racha(accidentes, hoy)
  const resumen = resumenMes(accidentes, month)
  const marcadores: CalendarEvent[] = accidentes.map(accidente => {
    const { icon, text } = marcadorAccidente(accidente)
    return { id: accidente.id, date: accidente.fecha, title: accidente.colaborador, icon, tone: text }
  })
  const delDetalle = detalle ? accidentes.filter(accidente => accidente.fecha === detalle) : []

  function abrirDia(date: string) {
    if (accidentes.some(accidente => accidente.fecha === date)) setDetalle(date)
  }

  // Si falla, el error lo muestra el modal (la promesa se rechaza).
  async function guardar(datos: DatosAccidente) {
    if (dialogo?.modo === "editar") {
      const actualizado = await actualizarAccidente(dialogo.accidente.id, datos)
      setAccidentes(current => current.map(accidente => accidente.id === actualizado.id ? actualizado : accidente))
      notify.success("Accidente actualizado")
    } else {
      const nuevo = await crearAccidente(datos)
      setAccidentes(current => [nuevo, ...current])
      notify.success("Accidente registrado")
    }
    setSelected(datos.fecha)
    setMonth(datos.fecha)
    // Si cambió de día, el detalle sigue al accidente.
    if (detalle) setDetalle(datos.fecha)
    setDialogo(null)
  }

  async function eliminar(accidente: Accidente) {
    const confirmed = await notify.confirm({
      title: "Eliminar accidente",
      description: `Se eliminará el accidente de ${accidente.colaborador}.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      appearance: "minimal",
    })
    if (!confirmed) return
    try {
      await eliminarAccidente(accidente.id)
    } catch {
      notify.error("No se pudo eliminar el accidente.")
      return
    }
    const restantes = accidentes.filter(item => item.id !== accidente.id)
    setAccidentes(restantes)
    // Sin accidentes en el día, se vuelve al calendario.
    if (selectedId === accidente.id) setSelectedId(null)
    if (!restantes.some(item => item.fecha === accidente.fecha)) setDetalle(null)
    notify.success("Accidente eliminado")
  }

  const modal = dialogo && (
    <AccidenteDialog key={dialogo.modo === "editar" ? dialogo.accidente.id : "nuevo"}
      accidente={dialogo.modo === "editar" ? dialogo.accidente : null}
      fecha={dialogo.modo === "crear" ? dialogo.fecha : dialogo.accidente.fecha}
      onClose={() => setDialogo(null)} onSave={guardar} />
  )

  if (detalle && delDetalle.length) {
    return <>
      <AccidentesDetalle titulo={formatDiaCompleto(detalle)} accidentes={delDetalle} canEdit={canManageSafety}
        selectedId={selectedId} side={detailSide} onSelect={setSelectedId}
        onBack={() => { setDetalle(null); setSelectedId(null) }} onCreate={() => setDialogo({ modo: "crear", fecha: detalle })}
        onEdit={accidente => setDialogo({ modo: "editar", accidente })} onDelete={eliminar} />
      {modal}
    </>
  }

  const crear = () => setDialogo({ modo: "crear", fecha: selected })

  return (
    // Móvil: todo apilado. Tablet: calendario arriba y los indicadores de dos en dos debajo.
    // PC: una sola pantalla con el panel a la derecha, más ancho conforme crece la pantalla.
    // minmax(0,1fr) en cada cuadrícula: ningún contenido ensancha la columna más que la pantalla.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:flex lg:min-h-0 lg:flex-col">
        <MonthCalendar month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} onActivate={abrirDia}
          events={marcadores} markersOnly countLabel={["accidente", "accidentes"]} label="Calendario de accidentes"
          dayClassName={date => listo && enRacha(date, rachaActual.desde, hoy) ? TONO_RACHA.fondo : undefined}
          actions={canManageSafety && (
            // Tablet: Crear junto a la navegación del mes; en móvil y lg va en el panel.
            <Button type="button" className="hidden md:inline-flex lg:hidden" disabled={!listo} aria-label="Registrar accidente" onClick={crear}>
              <Plus aria-hidden="true" />Crear
            </Button>
          )} />
      </div>

      <aside aria-label="Indicadores de accidentes" className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 lg:overflow-y-auto">
        {/* Crear ocupa la fila del mes y la navegación (mismo alto de control). */}
        {canManageSafety && (
          <Button type="button" className="w-full md:hidden lg:inline-flex" disabled={!listo} aria-label="Registrar accidente" onClick={crear}>
            <Plus aria-hidden="true" />Crear
          </Button>
        )}
        {loadError
          ? <p role="alert" className="text-body-md text-destructive">No se pudieron cargar los accidentes.</p>
          : loading
            ? <div aria-busy="true" aria-label="Cargando indicadores" className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            : <IndicadoresAccidentes rachaActual={rachaActual} resumen={resumen} mes={month} pendientes={pendientesSeguimiento(accidentes)} />}
      </aside>

      {modal}
    </div>
  )
}
