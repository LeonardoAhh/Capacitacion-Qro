"use client"

import { useEffect, useMemo, useState } from "react"
import { List, Plus, SquareKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanCardDialog } from "@/components/content/kanban-card-dialog"
import { KanbanColumn } from "@/components/content/kanban-column"
import { KanbanList } from "@/components/content/kanban-list"
import { useKanban } from "@/lib/hooks/useKanban"
import { notify } from "@/lib/notify"
import {
  DIAS_CONCLUIDAS_VISIBLES, esConcluidaAntigua, KANBAN_COLUMNAS, ordenarTarjetas,
  type DatosTarjeta, type KanbanEstado, type KanbanTarjeta,
} from "@/lib/kanban"

type Vista = "tablero" | "lista"

const VISTAS: { value: Vista; label: string; icon: typeof List }[] = [
  { value: "tablero", label: "Tablero", icon: SquareKanban },
  { value: "lista", label: "Lista", icon: List },
]

// Preferencia de vista por navegador; si el almacenamiento no está disponible, se usa el tablero.
const VISTA_KEY = "kanban-vista"

function mensaje(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

export default function KanbanPage() {
  const { tarjetas, miembros, loading, error, recargar, crear, actualizar, mover, eliminar } = useKanban()
  const [vista, setVista] = useState<Vista>("tablero")

  useEffect(() => {
    try {
      const guardada = window.localStorage.getItem(VISTA_KEY)
      if (guardada === "tablero" || guardada === "lista") setVista(guardada)
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
  const [dialog, setDialog] = useState<{ tarjeta: KanbanTarjeta | null; estado: KanbanEstado; base?: DatosTarjeta } | null>(null)
  // Las concluidas antiguas quedan ocultas hasta pedirlas; se recuerda solo en esta visita.
  const [verAnteriores, setVerAnteriores] = useState(false)

  const miembrosPorId = useMemo(() => new Map(miembros.map(miembro => [miembro.user_id, miembro])), [miembros])

  const antiguas = useMemo(() => tarjetas.filter(tarjeta => esConcluidaAntigua(tarjeta)).length, [tarjetas])
  const porColumna = useMemo(() => {
    const visibles = verAnteriores ? tarjetas : tarjetas.filter(tarjeta => !esConcluidaAntigua(tarjeta))
    return KANBAN_COLUMNAS.map(columna => ({
      ...columna,
      tarjetas: ordenarTarjetas(visibles.filter(tarjeta => tarjeta.estado === columna.estado)),
    }))
  }, [tarjetas, verAnteriores])

  const verAnterioresBoton = antiguas > 0 && (
    <Button type="button" variant="ghost" size="sm" className="self-start px-2 text-muted-foreground"
      onClick={() => setVerAnteriores(current => !current)} aria-pressed={verAnteriores}>
      {verAnteriores ? `Ocultar concluidas de hace más de ${DIAS_CONCLUIDAS_VISIBLES} días` : `Ver anteriores (${antiguas})`}
    </Button>
  )

  function duplicar(tarjeta: KanbanTarjeta) {
    const { tipo, estado, prioridad, titulo, descripcion, fecha_inicio, fecha_limite, responsable_id, repeticion } = tarjeta
    setDialog({ tarjeta: null, estado, base: { tipo, estado, prioridad, titulo, descripcion, fecha_inicio, fecha_limite, responsable_id, repeticion } })
  }
  // La lista sigue el orden de las columnas y, dentro de cada estado, el mismo orden del tablero.
  const enLista = useMemo(() => porColumna.flatMap(columna => columna.tarjetas), [porColumna])

  async function handleSave(datos: DatosTarjeta) {
    if (dialog?.tarjeta) {
      await actualizar(dialog.tarjeta.id, datos)
      const concluyoRepetible = dialog.tarjeta.estado !== "concluido" && datos.estado === "concluido" && datos.repeticion !== "ninguna"
      notify.success(concluyoRepetible ? "Tarjeta actualizada · se programó el siguiente recordatorio" : "Tarjeta actualizada")
    } else {
      await crear(datos)
      notify.success("Tarjeta creada")
    }
    setDialog(null)
  }

  // Al arrastrar, el cambio ya es visible: solo se avisa si falla.
  async function handleMove(id: string, estado: KanbanEstado) {
    try {
      await mover(id, estado)
      const tarjeta = tarjetas.find(item => item.id === id)
      // La base de datos crea el siguiente recordatorio; aparece solo en "Por hacer".
      if (estado === "concluido" && tarjeta && tarjeta.estado !== "concluido" && tarjeta.repeticion !== "ninguna") {
        notify.success("Se programó el siguiente recordatorio")
      }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <Tabs value={vista} onValueChange={value => cambiarVista(value as Vista)}>
          <TabsList aria-label="Vista">
            {VISTAS.map(item => (
              <TabsTrigger key={item.value} value={item.value} className="gap-2">
                <item.icon className="size-4" aria-hidden="true" />{item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button type="button" className="ml-auto shrink-0 max-sm:w-11 max-sm:px-0" disabled={loading || Boolean(error)}
          onClick={() => setDialog({ tarjeta: null, estado: "por_hacer" })}>
          <Plus aria-hidden="true" /><span className="max-sm:sr-only">Nueva tarjeta</span>
        </Button>
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
      ) : vista === "lista" ? (
        <div className="grid gap-2">
          <KanbanList tarjetas={enLista} miembros={miembrosPorId}
            onEdit={tarjeta => setDialog({ tarjeta, estado: tarjeta.estado })}
            onDuplicate={duplicar}
            onDelete={tarjeta => void handleDelete(tarjeta)} />
          {verAnterioresBoton}
        </div>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          {porColumna.map(columna => (
            <KanbanColumn key={columna.estado} estado={columna.estado} label={columna.label} tarjetas={columna.tarjetas}
              miembros={miembrosPorId}
              onAdd={estado => setDialog({ tarjeta: null, estado })}
              onEdit={tarjeta => setDialog({ tarjeta, estado: tarjeta.estado })}
              onDuplicate={duplicar}
              footer={columna.estado === "concluido" ? verAnterioresBoton : undefined}
              onDelete={tarjeta => void handleDelete(tarjeta)}
              onDropCard={(id, estado) => void handleMove(id, estado)} />
          ))}
        </div>
      )}

      {dialog && (
        <KanbanCardDialog key={dialog.tarjeta?.id ?? `nueva-${dialog.estado}`} tarjeta={dialog.tarjeta}
          estadoInicial={dialog.estado} base={dialog.base} miembros={miembros}
          onClose={() => setDialog(null)} onSave={handleSave} />
      )}
    </div>
  )
}
