"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Plus, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatDiaCompleto, MonthCalendar, type CalendarEvent } from "@/components/ui/month-calendar"
import { DETAIL_SIDE_QUERY } from "@/components/ui/side-detail-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { hoyISO } from "@/lib/fechas"
import { useRole } from "@/lib/hooks"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { notify } from "@/lib/notify"
import { describeSupabaseError } from "@/lib/supabase/errors"
import {
  actualizarAccidente, cargarAccidentes, crearAccidente, eliminarAccidente, enRacha, marcadorAccidente, pendientesSeguimiento, racha, resumenMes, TONO_RACHA,
  type Accidente, type DatosAccidente,
} from "@/lib/salud-ocupacional"
import { AccidenteDialog } from "./accidente-dialog"
import { AccidentesDetalle } from "./accidentes-detalle"
import { IndicadoresAccidentes } from "./indicadores-accidentes"

type Dialogo = { modo: "crear"; fecha: string } | { modo: "editar"; accidente: Accidente } | null

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
  const [loadError, setLoadError] = useState("")

  const recargar = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const rows = await cargarAccidentes()
      setAccidentes(rows)
    } catch (err) {
      setLoadError(describeSupabaseError(err, "No se pudieron cargar los accidentes"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    cargarAccidentes()
      .then(rows => { if (active) { setAccidentes(rows); setLoadError("") } })
      .catch(err => { if (active) setLoadError(describeSupabaseError(err, "No se pudieron cargar los accidentes")) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const listo = !loading && !loadError

  const rachaActual = useMemo(() => racha(accidentes, hoy), [accidentes, hoy])
  const resumen = useMemo(() => resumenMes(accidentes, month), [accidentes, month])
  const pendientes = useMemo(() => pendientesSeguimiento(accidentes), [accidentes])
  const marcadores = useMemo<CalendarEvent[]>(() => accidentes.map(accidente => {
    const { icon, text } = marcadorAccidente(accidente)
    return { id: accidente.id, date: accidente.fecha, title: accidente.colaborador, icon, tone: text }
  }), [accidentes])
  const delDetalle = useMemo(
    () => (detalle ? accidentes.filter(accidente => accidente.fecha === detalle) : []),
    [accidentes, detalle],
  )

  function abrirDia(date: string) {
    if (accidentes.some(accidente => accidente.fecha === date)) setDetalle(date)
  }

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
    } catch (err) {
      notify.error(describeSupabaseError(err, "No se pudo eliminar el accidente"))
      return
    }
    const restantes = accidentes.filter(item => item.id !== accidente.id)
    setAccidentes(restantes)
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:flex lg:min-h-0 lg:flex-col">
        <MonthCalendar month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} onActivate={abrirDia}
          events={marcadores} markersOnly countLabel={["accidente", "accidentes"]} label="Calendario de accidentes"
          dayClassName={date => listo && enRacha(date, rachaActual.desde, hoy) ? TONO_RACHA.fondo : undefined}
          actions={canManageSafety && (
            <Button type="button" size="sm" className="hidden md:inline-flex lg:hidden" disabled={!listo} onClick={crear}>
              <Plus aria-hidden="true" />Registrar accidente
            </Button>
          )} />
      </div>

      <aside aria-label="Indicadores de accidentes" className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 lg:overflow-y-auto">
        {canManageSafety && (
          <Button type="button" size="sm" className="w-full md:hidden lg:inline-flex" disabled={!listo} onClick={crear}>
            <Plus aria-hidden="true" />Registrar accidente
          </Button>
        )}
        {loadError
          ? (
            <Alert variant="destructive" className="grid gap-3 bg-destructive/10">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{loadError}</AlertDescription>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => void recargar()}>
                  <RotateCw aria-hidden="true" />Reintentar
                </Button>
              </div>
            </Alert>
          )
          : loading
            ? (
              <div role="status" aria-busy="true" aria-label="Cargando indicadores" className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
                <span className="sr-only">Cargando indicadores…</span>
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-44 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            )
            : <IndicadoresAccidentes rachaActual={rachaActual} resumen={resumen} mes={month} pendientes={pendientes} />}
      </aside>

      {modal}
    </div>
  )
}
