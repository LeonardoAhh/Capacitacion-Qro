"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarRange, LayoutTemplate, List, Plus, SquareKanban, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanCalendar } from "@/components/content/kanban-calendar"
import { KanbanCardDialog } from "@/components/content/kanban-card-dialog"
import { KanbanColumn } from "@/components/content/kanban-column"
import { KanbanList } from "@/components/content/kanban-list"
import { KanbanAccionesProvider, type KanbanAcciones } from "@/components/content/kanban-meta"
import { KanbanMiDia } from "@/components/content/kanban-mi-dia"
import { KanbanNotaDialog, type KanbanNotaConfig } from "@/components/content/kanban-nota-dialog"
import { KanbanPlantillasDialog } from "@/components/content/kanban-plantillas-dialog"
import { KanbanTeam } from "@/components/content/kanban-team"
import { useKanban, type CambiosTarjeta } from "@/lib/hooks/useKanban"
import { useUser } from "@/lib/hooks/useUser"
import { notify } from "@/lib/notify"
import {
  DIAS_CONCLUIDAS_VISIBLES, enProgresoDe, esConcluidaAntigua, KANBAN_COLUMNAS, LIMITE_EN_PROGRESO, MAX_TITULO,
  ordenarTarjetas, plantillaDesdeTarjeta,
  type DatosTarjeta, type KanbanEstado, type KanbanPlantilla, type KanbanTarjeta,
} from "@/lib/kanban"

type Vista = "tablero" | "lista" | "calendario" | "equipo"

const VISTAS: { value: Vista; label: string; icon: typeof List }[] = [
  { value: "tablero", label: "Tablero", icon: SquareKanban },
  { value: "lista", label: "Lista", icon: List },
  { value: "calendario", label: "Semana", icon: CalendarRange },
  { value: "equipo", label: "Equipo", icon: Users },
]

const esVista = (value: string | null): value is Vista => VISTAS.some(item => item.value === value)

// Preferencia de vista por navegador; si el almacenamiento no está disponible, se usa el tablero.
const VISTA_KEY = "kanban-vista"

function mensaje(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

export default function KanbanPage() {
  const {
    tarjetas, miembros, plantillas, miDia, loading, error, recargar,
    crear, actualizar, mover, eliminar, alternarMiDia, crearPlantilla, eliminarPlantilla,
  } = useKanban()
  const userId = useUser().user?.id ?? null
  const [vista, setVista] = useState<Vista>("tablero")
  const [dialog, setDialog] = useState<{ tarjeta: KanbanTarjeta | null; estado: KanbanEstado; base?: DatosTarjeta } | null>(null)
  const [nota, setNota] = useState<KanbanNotaConfig | null>(null)
  const [verPlantillas, setVerPlantillas] = useState(false)
  // Las concluidas antiguas quedan ocultas hasta pedirlas; se recuerda solo en esta visita.
  const [verAnteriores, setVerAnteriores] = useState(false)

  useEffect(() => {
    try {
      const guardada = window.localStorage.getItem(VISTA_KEY)
      if (esVista(guardada)) setVista(guardada)
    } catch {
      // Sin almacenamiento: se queda la vista por defecto.
    }
  }, [])

  function cambiarVista(value: Vista) {
    setVista(value)
    try {
      window.localStorage.setItem(VISTA_KEY, value)
    } catch {
      // No se pudo recordar; la vista cambia igual.
    }
  }

  const miembrosPorId = useMemo(() => new Map(miembros.map(miembro => [miembro.user_id, miembro])), [miembros])

  const antiguas = useMemo(() => tarjetas.filter(tarjeta => esConcluidaAntigua(tarjeta)).length, [tarjetas])
  const porColumna = useMemo(() => {
    const visibles = verAnteriores ? tarjetas : tarjetas.filter(tarjeta => !esConcluidaAntigua(tarjeta))
    return KANBAN_COLUMNAS.map(columna => ({
      ...columna,
      tarjetas: ordenarTarjetas(visibles.filter(tarjeta => tarjeta.estado === columna.estado)),
    }))
  }, [tarjetas, verAnteriores])
  // La lista sigue el orden de las columnas y, dentro de cada estado, el mismo orden del tablero.
  const enLista = useMemo(() => porColumna.flatMap(columna => columna.tarjetas), [porColumna])
  const deMiDia = useMemo(() => ordenarTarjetas(tarjetas.filter(tarjeta => miDia.has(tarjeta.id))), [tarjetas, miDia])

  const verAnterioresBoton = antiguas > 0 && (
    <Button type="button" variant="ghost" size="sm" className="self-start px-2 text-muted-foreground"
      onClick={() => setVerAnteriores(current => !current)} aria-pressed={verAnteriores}>
      {verAnteriores ? `Ocultar concluidas de hace más de ${DIAS_CONCLUIDAS_VISIBLES} días` : `Ver anteriores (${antiguas})`}
    </Button>
  )

  /** Límite de trabajo en progreso: solo avisa, no bloquea. */
  function avisarLimite(responsableId: string | null, excluirId?: string) {
    if (!responsableId) return
    const actuales = enProgresoDe(tarjetas, responsableId, excluirId)
    if (actuales < LIMITE_EN_PROGRESO) return
    const quien = responsableId === userId ? "Ya tienes" : `${miembrosPorId.get(responsableId)?.nombre ?? "Esta persona"} ya tiene`
    notify.warning(`${quien} ${actuales} en progreso. Considera concluir alguna antes de empezar otra.`)
  }

  /** Cambio rápido desde el menú, con aviso de éxito o error. */
  async function cambiar(tarjeta: KanbanTarjeta, cambios: CambiosTarjeta, exito: string) {
    try {
      await actualizar(tarjeta.id, cambios)
      notify.success(exito)
    } catch (cause) {
      notify.error(mensaje(cause, "No se pudo actualizar la tarjeta."))
    }
  }

  async function handleSave(datos: DatosTarjeta) {
    const anterior = dialog?.tarjeta
    if (anterior) {
      await actualizar(anterior.id, datos)
      const concluyoRepetible = anterior.estado !== "concluido" && datos.estado === "concluido" && datos.repeticion !== "ninguna"
      notify.success(concluyoRepetible ? "Tarjeta actualizada · se programó el siguiente recordatorio" : "Tarjeta actualizada")
    } else {
      await crear(datos)
      notify.success("Tarjeta creada")
    }
    const empiezaEnProgreso = datos.estado === "en_progreso"
      && (!anterior || anterior.estado !== "en_progreso" || anterior.responsable_id !== datos.responsable_id)
    if (empiezaEnProgreso) avisarLimite(datos.responsable_id, anterior?.id)
    setDialog(null)
  }

  // Al arrastrar, el cambio ya es visible: solo se avisa si falla o si conviene saber algo más.
  async function handleMove(id: string, estado: KanbanEstado) {
    const tarjeta = tarjetas.find(item => item.id === id)
    try {
      await mover(id, estado)
      if (!tarjeta || tarjeta.estado === estado) return
      // La base de datos crea el siguiente recordatorio; aparece solo en "Por hacer".
      if (estado === "concluido" && tarjeta.repeticion !== "ninguna") notify.success("Se programó el siguiente recordatorio")
      if (estado === "en_progreso") avisarLimite(tarjeta.responsable_id, tarjeta.id)
    } catch (cause) {
      notify.error(mensaje(cause, "No se pudo mover la tarjeta."))
    }
  }

  async function handleDelete(tarjeta: KanbanTarjeta) {
    const confirmed = await notify.confirm({
      title: "Eliminar tarjeta",
      description: `Se eliminará «${tarjeta.titulo}» para todo el equipo.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      appearance: "minimal",
    })
    if (!confirmed) return
    try {
      await eliminar(tarjeta.id)
      notify.success("Tarjeta eliminada")
    } catch (cause) {
      notify.error(mensaje(cause, "No se pudo eliminar la tarjeta."))
    }
  }

  async function handleDeletePlantilla(plantilla: KanbanPlantilla) {
    const confirmed = await notify.confirm({
      title: "Eliminar plantilla",
      description: `Se eliminará «${plantilla.nombre}» para todo el equipo. Las tarjetas creadas con ella no cambian.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      appearance: "minimal",
    })
    if (!confirmed) return
    try {
      await eliminarPlantilla(plantilla.id)
      notify.success("Plantilla eliminada")
    } catch (cause) {
      notify.error(mensaje(cause, "No se pudo eliminar la plantilla."))
    }
  }

  const acciones: KanbanAcciones = {
    userId,
    miDia,
    editar: tarjeta => setDialog({ tarjeta, estado: tarjeta.estado }),
    duplicar: tarjeta => {
      const { tipo, estado, prioridad, titulo, descripcion, fecha_inicio, fecha_limite, responsable_id, repeticion, colaboradores } = tarjeta
      setDialog({
        tarjeta: null, estado,
        base: { tipo, estado, prioridad, titulo, descripcion, fecha_inicio, fecha_limite, responsable_id, repeticion, colaboradores },
      })
    },
    guardarPlantilla: tarjeta => setNota({
      title: "Guardar como plantilla",
      description: tarjeta.titulo,
      label: "Nombre de la plantilla",
      required: true,
      confirmLabel: "Guardar plantilla",
      inicial: tarjeta.titulo.slice(0, MAX_TITULO),
      maxLength: MAX_TITULO,
      onSave: async nombre => {
        await crearPlantilla(plantillaDesdeTarjeta(tarjeta, nombre))
        notify.success("Plantilla guardada")
      },
    }),
    alternarMiDia: tarjeta => {
      const agregar = !miDia.has(tarjeta.id)
      alternarMiDia(tarjeta.id, agregar)
        .then(() => notify.success(agregar ? "Agregada a tu día" : "Quitada de tu día"))
        .catch(cause => notify.error(mensaje(cause, "No se pudo actualizar tu día.")))
    },
    pedirApoyo: tarjeta => setNota({
      title: "Pedir apoyo",
      description: tarjeta.titulo,
      label: "¿En qué necesitas apoyo?",
      required: false,
      confirmLabel: "Pedir apoyo",
      onSave: async texto => {
        await actualizar(tarjeta.id, { necesita_apoyo: true, apoyo_nota: texto || null })
        notify.success("El equipo verá que pides apoyo")
      },
    }),
    quitarApoyo: tarjeta => void cambiar(tarjeta, { necesita_apoyo: false, apoyo_nota: null }, "Pedido de apoyo retirado"),
    // Sin responsable, quien toma la tarjeta queda a cargo; si ya hay uno, se suma como colaborador.
    tomar: tarjeta => {
      if (!userId) return
      const cambios: CambiosTarjeta = tarjeta.responsable_id
        ? { colaboradores: [...tarjeta.colaboradores, userId] }
        : { responsable_id: userId }
      void cambiar(tarjeta, { ...cambios, necesita_apoyo: false, apoyo_nota: null },
        tarjeta.responsable_id ? "Te sumaste como colaborador" : "Ahora eres responsable")
    },
    bloquear: tarjeta => setNota({
      title: "Marcar bloqueada",
      description: tarjeta.titulo,
      label: "¿Qué o a quién esperas?",
      required: true,
      confirmLabel: "Marcar bloqueada",
      onSave: async motivo => {
        await actualizar(tarjeta.id, { bloqueo_motivo: motivo })
        notify.success("Tarjeta marcada como bloqueada")
      },
    }),
    desbloquear: tarjeta => void cambiar(tarjeta, { bloqueo_motivo: null }, "Tarjeta desbloqueada"),
    eliminar: tarjeta => void handleDelete(tarjeta),
  }

  return (
    <KanbanAccionesProvider value={acciones}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Tabs value={vista} onValueChange={value => cambiarVista(value as Vista)}>
            <TabsList aria-label="Vista">
              {VISTAS.map(item => (
                <TabsTrigger key={item.value} value={item.value} className="gap-2 max-sm:w-11 max-sm:px-0" title={item.label}>
                  <item.icon className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {plantillas.length > 0 && (
              <Button type="button" variant="outline" size="icon" aria-label={`Plantillas (${plantillas.length})`} title="Plantillas"
                onClick={() => setVerPlantillas(true)}>
                <LayoutTemplate aria-hidden="true" />
              </Button>
            )}
            <Button type="button" className="max-sm:w-11 max-sm:px-0" disabled={loading || Boolean(error)}
              onClick={() => setDialog({ tarjeta: null, estado: "por_hacer" })}>
              <Plus aria-hidden="true" /><span className="max-sm:sr-only">Nueva tarjeta</span>
            </Button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-body-md text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void recargar()}>Reintentar</Button>
          </div>
        ) : loading ? (
          <div role="status" aria-busy="true" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <span className="sr-only">Cargando tablero</span>
            {KANBAN_COLUMNAS.map(columna => <Skeleton key={columna.estado} aria-hidden="true" className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <>
            {vista !== "equipo" && <KanbanMiDia tarjetas={deMiDia} />}
            {vista === "equipo" ? (
              <KanbanTeam tarjetas={tarjetas} miembros={miembros} />
            ) : vista === "calendario" ? (
              <KanbanCalendar tarjetas={tarjetas} />
            ) : vista === "lista" ? (
              <div className="grid gap-2">
                <KanbanList tarjetas={enLista} miembros={miembrosPorId} />
                {verAnterioresBoton}
              </div>
            ) : (
              <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
                {porColumna.map(columna => (
                  <KanbanColumn key={columna.estado} estado={columna.estado} label={columna.label} tarjetas={columna.tarjetas}
                    miembros={miembrosPorId}
                    onAdd={estado => setDialog({ tarjeta: null, estado })}
                    footer={columna.estado === "concluido" ? verAnterioresBoton : undefined}
                    onDropCard={(id, estado) => void handleMove(id, estado)} />
                ))}
              </div>
            )}
          </>
        )}

        {dialog && (
          <KanbanCardDialog key={dialog.tarjeta?.id ?? `nueva-${dialog.estado}`} tarjeta={dialog.tarjeta}
            estadoInicial={dialog.estado} base={dialog.base} miembros={miembros} plantillas={plantillas}
            onClose={() => setDialog(null)} onSave={handleSave} />
        )}
        {nota && <KanbanNotaDialog config={nota} onClose={() => setNota(null)} />}
        {verPlantillas && (
          <KanbanPlantillasDialog plantillas={plantillas} onClose={() => setVerPlantillas(false)}
            onDelete={plantilla => void handleDeletePlantilla(plantilla)} />
        )}
      </div>
    </KanbanAccionesProvider>
  )
}
