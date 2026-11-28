"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { DateTextInput } from "@/components/ui/date-text-input"
import { EmployeeNumberInput } from "@/components/ui/employee-inputs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { hoyISO, isoATexto } from "@/lib/fechas"
import { normalizeCourseName, type Course, type CourseMatch } from "@/lib/hooks/useCapacitacion"
import { notify } from "@/lib/notify"
import { guardarCursos, leerCalificacion, type FilaCurso } from "@/lib/plantilla/cursos-import"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"

/** Los números de la plantilla son de 4 dígitos: al completarlos se agrega sin pulsar nada. */
const DIGITOS_AUTO = 4
const FILAS_POR_PAGINA = 10
const STORAGE_KEY = "cargar-cursos:borrador"

const CAMPO = "min-w-0 space-y-2"
const CONTROL = "md:h-(--control-height-sm)"
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

export interface EmpleadoResumen {
  id: string
  nombre: string
}

interface FilaCapturada {
  id: string
  numero: string
  nombre: string
  cursoId: string
  cursoNombre: string
  /** "AAAA-MM-DD" */
  fecha: string
  /** Texto editable en la fila (vacío = sin calificación; 0 a 10). */
  calificacion: string
}

interface BorradorCaptura {
  cursoId: string
  fecha: string
  calificacion: string
  filas: FilaCapturada[]
}

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function limpiarCalificacionInput(valor: string): string {
  const limpio = valor.replace(/[^0-9.,]/g, "").replace(",", ".")
  const partes = limpio.split(".")
  if (partes.length === 1) return partes[0].slice(0, 2)
  return `${partes[0].slice(0, 2)}.${partes.slice(1).join("").slice(0, 2)}`
}

function leerBorrador(): BorradorCaptura | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BorradorCaptura>
    if (!parsed || typeof parsed !== "object") return null
    return {
      cursoId: typeof parsed.cursoId === "string" ? parsed.cursoId : "",
      fecha: typeof parsed.fecha === "string" && parsed.fecha ? parsed.fecha : hoyISO(),
      calificacion: typeof parsed.calificacion === "string" ? parsed.calificacion : "",
      filas: Array.isArray(parsed.filas) ? parsed.filas : [],
    }
  } catch {
    return null
  }
}

function guardarBorrador(borrador: BorradorCaptura) {
  try {
    if (borrador.filas.length === 0 && !borrador.cursoId && !borrador.calificacion) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(borrador))
  } catch {
    // Almacenamiento no disponible en contextos restringidos.
  }
}

function CursoPicker({
  id,
  catalogo,
  value,
  disabled,
  onChange,
  onAfterPick,
}: {
  id: string
  catalogo: readonly Course[]
  value: string
  disabled: boolean
  onChange: (courseId: string) => void
  onAfterPick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const listId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const pickedRef = useRef(false)

  const selected = useMemo(() => catalogo.find(c => c.id === value) ?? null, [catalogo, value])
  const visible = useMemo(() => {
    const q = normalizarTexto(query.trim())
    if (!q) return catalogo
    return catalogo.filter(c => normalizarTexto(c.name).includes(q))
  }, [catalogo, query])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const pick = (courseId: string) => {
    pickedRef.current = true
    onChange(courseId)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className={cn(
            "h-(--control-height) w-full min-w-0 justify-between bg-card px-3 text-body-md font-normal shadow-none hover:bg-accent/60",
            CONTROL,
          )}
        >
          <span className={cn("min-w-0 truncate text-left", !selected && "text-muted-foreground")}>
            {selected?.name ?? "Selecciona un curso"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        onCloseAutoFocus={event => {
          if (!pickedRef.current) return
          event.preventDefault()
          pickedRef.current = false
          onAfterPick?.()
        }}
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="relative border-b border-border/60 p-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && visible.length > 0) {
                event.preventDefault()
                pick(visible[0].id)
              }
            }}
            aria-label="Buscar curso"
            placeholder="Buscar curso…"
            className="h-(--control-height-sm) pl-9"
          />
        </div>
        <div id={listId} role="listbox" className="max-h-60 overflow-y-auto overscroll-contain p-1">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-body-sm text-muted-foreground">Sin cursos que coincidan.</p>
          ) : (
            visible.map(course => {
              const active = course.id === value
              return (
                <button
                  key={course.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={course.name}
                  onClick={() => pick(course.id)}
                  className={cn(
                    "flex min-h-(--control-height-sm) w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-body-sm transition-colors hover:bg-accent",
                    active && "bg-accent/60 font-medium text-foreground",
                  )}
                >
                  <span className="min-w-0 truncate">{course.name}</span>
                  {active && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface CargarCursosRapidoProps {
  empleados: ReadonlyMap<string, EmpleadoResumen> | null
  catalogo: readonly Course[]
  loading: boolean
  onSaved?: () => void
}

/**
 * Captura en ráfaga de cursos tomados (mismo flujo que Formato TE):
 * curso, fecha y calificación se fijan una vez y cada número de 4 dígitos
 * agrega al colaborador al instante y deja el cursor listo para el siguiente.
 */
export function CargarCursosRapido({ empleados, catalogo, loading, onSaved }: CargarCursosRapidoProps) {
  const id = useId()
  const numeroRef = useRef<HTMLInputElement>(null)
  const [borrador] = useState(leerBorrador)
  const [cursoId, setCursoId] = useState(() => borrador?.cursoId ?? "")
  const [fecha, setFecha] = useState(() => borrador?.fecha ?? hoyISO())
  const [calificacion, setCalificacion] = useState(() => borrador?.calificacion ?? "")
  const [filas, setFilas] = useState<FilaCapturada[]>(() => borrador?.filas ?? [])
  const [numero, setNumero] = useState("")
  const [pagina, setPagina] = useState(1)
  const [conteo, setConteo] = useState(filas.length)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    guardarBorrador({ cursoId, fecha, calificacion, filas })
  }, [cursoId, fecha, calificacion, filas])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA))
  if (filas.length !== conteo) {
    setConteo(filas.length)
    if (filas.length > conteo) setPagina(Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA)))
  }
  const paginaActual = Math.min(Math.max(1, pagina), totalPaginas)
  const visibles = filas.slice((paginaActual - 1) * FILAS_POR_PAGINA, paginaActual * FILAS_POR_PAGINA)

  const cursoSeleccionado = useMemo(() => catalogo.find(c => c.id === cursoId) ?? null, [catalogo, cursoId])
  const calificacionInvalida = calificacion.trim() !== "" && leerCalificacion(calificacion) === undefined
  const filasInvalidas = useMemo(
    () => filas.filter(fila => fila.calificacion.trim() !== "" && leerCalificacion(fila.calificacion) === undefined).length,
    [filas],
  )

  const intentar = (valor: string, avisar: boolean) => {
    if (!empleados || !valor) return
    const empleado = empleados.get(valor)
    if (!empleado) {
      if (avisar) notify.error("No está en Plantilla", { description: `Número ${valor}` })
      return
    }
    if (!cursoSeleccionado) { notify.error("Selecciona un curso"); return }
    if (!fecha) { notify.error("Falta la fecha"); return }
    if (calificacionInvalida) { notify.error("Calificación inválida", { description: "Usa un valor de 0 a 10" }); return }

    setNumero("")
    if (filas.some(fila => fila.numero === valor && fila.cursoId === cursoSeleccionado.id)) {
      notify.warning("Ya está en la lista", { description: `${empleado.nombre} · ${cursoSeleccionado.name}` })
      numeroRef.current?.focus()
      return
    }

    setFilas(actuales => [
      ...actuales,
      {
        id: crypto.randomUUID(),
        numero: valor,
        nombre: empleado.nombre,
        cursoId: cursoSeleccionado.id,
        cursoNombre: cursoSeleccionado.name,
        fecha,
        calificacion: calificacion.trim(),
      },
    ])
    numeroRef.current?.focus()
  }

  const actualizarCalificacionFila = (filaId: string, valor: string) => {
    const limpio = limpiarCalificacionInput(valor)
    setFilas(actuales => actuales.map(fila => fila.id === filaId ? { ...fila, calificacion: limpio } : fila))
  }

  const quitarFila = (filaId: string) => {
    setFilas(actuales => actuales.filter(fila => fila.id !== filaId))
  }

  const vaciar = async () => {
    const ok = await notify.confirm({
      title: "Vaciar la lista",
      description: `Se quitarán ${filas.length} ${filas.length === 1 ? "registro" : "registros"} sin guardar.`,
      confirmLabel: "Vaciar",
      tone: "destructive",
    })
    if (ok) {
      setFilas([])
      numeroRef.current?.focus()
    }
  }

  const handleSave = async () => {
    if (!empleados || filas.length === 0) return
    if (filasInvalidas > 0) {
      notify.error("Corrige las calificaciones marcadas", { description: "Deben ir de 0 a 10, con hasta dos decimales" })
      return
    }

    const empleadoId = new Map<string, string>()
    const cursosUnicos = new Map<string, CourseMatch>()
    const filasGuardar: FilaCurso[] = []

    for (const fila of filas) {
      const emp = empleados.get(fila.numero)
      if (!emp) continue
      empleadoId.set(fila.numero, emp.id)
      const cal = leerCalificacion(fila.calificacion)
      if (cal === undefined) return
      filasGuardar.push({
        numero: fila.numero,
        curso: fila.cursoNombre,
        fecha: fila.fecha,
        calificacion: cal,
      })
      if (!cursosUnicos.has(fila.cursoNombre)) {
        cursosUnicos.set(fila.cursoNombre, {
          rawName: fila.cursoNombre,
          normalizedName: normalizeCourseName(fila.cursoNombre),
          status: "exact",
          suggestedCourseId: fila.cursoId,
          suggestedCourseName: fila.cursoNombre,
          resolvedCourseId: fila.cursoId,
          createNew: false,
          confidence: 1,
        })
      }
    }

    setSaving(true)
    try {
      const guardado = await guardarCursos(filasGuardar, empleadoId, [...cursosUnicos.values()])
      notify.success(`${guardado.insertados + guardado.actualizados} cursos cargados`, {
        description: `${guardado.insertados} nuevos y ${guardado.actualizados} actualizados`,
      })
      setFilas([])
      onSaved?.()
      numeroRef.current?.focus()
    } catch (caught) {
      notify.error(describeSupabaseError(caught, "No se pudieron cargar los cursos"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Cargando catálogo y plantilla" className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_minmax(0,7.5rem)_minmax(0,10rem)_auto]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-(--control-height-sm) w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="step-enter space-y-6">
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_minmax(0,7.5rem)_minmax(0,10rem)_auto]">
        <div className={cn(CAMPO, "col-span-2 sm:col-span-1")}>
          <Label htmlFor={`${id}-fecha`}>Fecha</Label>
          <DateTextInput
            id={`${id}-fecha`}
            disabled={saving}
            className={CONTROL}
            value={fecha}
            onValueChange={setFecha}
          />
        </div>

        <div className={cn(CAMPO, "col-span-2 sm:col-span-3 xl:col-span-1")}>
          <Label htmlFor={`${id}-curso`}>Curso</Label>
          <CursoPicker
            id={`${id}-curso`}
            catalogo={catalogo}
            value={cursoId}
            disabled={saving || catalogo.length === 0}
            onChange={setCursoId}
            onAfterPick={() => numeroRef.current?.focus()}
          />
        </div>

        <div className={CAMPO}>
          <Label htmlFor={`${id}-calificacion`}>Calificación</Label>
          <Input
            id={`${id}-calificacion`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0 a 10"
            disabled={saving}
            aria-invalid={calificacionInvalida || undefined}
            className={cn(CONTROL, "tabular-nums")}
            value={calificacion}
            onChange={event => setCalificacion(limpiarCalificacionInput(event.target.value))}
            onKeyDown={event => {
              if (event.key !== "Enter") return
              event.preventDefault()
              intentar(numero, true)
            }}
          />
        </div>

        <div className={CAMPO}>
          <Label htmlFor={`${id}-numero`}>Número de empleado</Label>
          <EmployeeNumberInput
            ref={numeroRef}
            id={`${id}-numero`}
            autoFocus
            disabled={!empleados || saving}
            aria-busy={!empleados || undefined}
            className={CONTROL}
            value={numero}
            onValueChange={valor => {
              setNumero(valor)
              if (valor.length >= DIGITOS_AUTO) intentar(valor, false)
            }}
            onKeyDown={event => {
              if (event.key !== "Enter") return
              event.preventDefault()
              intentar(numero, true)
            }}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving || !numero}
          className="col-span-2 w-full sm:col-span-2 sm:w-auto sm:justify-self-start xl:col-span-1"
          onClick={() => intentar(numero, true)}
        >
          <Plus aria-hidden="true" />Agregar
        </Button>
      </div>

      <section aria-labelledby={`${id}-lista`} className="space-y-3">
        <div className="flex min-h-(--control-height-sm) flex-wrap items-center justify-between gap-2">
          <h2 id={`${id}-lista`} className="text-eyebrow uppercase text-muted-foreground">
            Registros{filas.length > 0 ? ` (${filas.length})` : ""}
          </h2>
          {filas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void vaciar()}
              >
                <Trash2 aria-hidden="true" />
                Vaciar lista
              </Button>
              <Button type="button" size="sm" loading={saving} onClick={() => void handleSave()}>
                {`Cargar ${filas.length} ${filas.length === 1 ? "registro" : "registros"}`}
              </Button>
            </div>
          )}
        </div>

        {filas.length === 0 ? (
          <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
            Elige un curso y escribe el número de empleado para agregarlo.
          </p>
        ) : (
          <div className="@container overflow-hidden rounded-xl border bg-card">
            {totalPaginas > 1 && (
              <header className="flex min-h-12 items-center justify-between gap-3 border-b py-1 pl-(--card-padding) pr-2">
                <span className="text-body-sm tabular-nums text-muted-foreground">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <CompactPager
                  label="Páginas de cursos capturados"
                  page={paginaActual}
                  totalPages={totalPaginas}
                  onPageChange={setPagina}
                />
              </header>
            )}
            <Table className="table-fixed">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className={cn(HEAD, "w-20")}>No. Emp</TableHead>
                  <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "hidden @2xl:table-cell")}>Curso</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "hidden w-28 @3xl:table-cell")}>Fecha</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "w-28 text-right")}>Calif.</TableHead>
                  <TableHead className="w-14 px-1"><span className="sr-only">Quitar</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(fila => {
                  const invalida = fila.calificacion.trim() !== "" && leerCalificacion(fila.calificacion) === undefined
                  return (
                    <TableRow key={fila.id}>
                      <TableCell className="text-body-sm tabular-nums text-foreground">{fila.numero}</TableCell>
                      <TableCell className="min-w-0">
                        <span className="block truncate text-label-sm text-foreground" title={fila.nombre}>{fila.nombre}</span>
                        <span className="block truncate text-body-sm text-muted-foreground @2xl:hidden" title={fila.cursoNombre}>
                          {fila.cursoNombre} · {isoATexto(fila.fecha)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden truncate text-body-sm text-muted-foreground @2xl:table-cell" title={fila.cursoNombre}>
                        {fila.cursoNombre}
                      </TableCell>
                      <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground @3xl:table-cell">
                        {isoATexto(fila.fecha)}
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <Input
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={saving}
                          aria-label={`Calificación de ${fila.nombre}`}
                          aria-invalid={invalida || undefined}
                          placeholder="-"
                          value={fila.calificacion}
                          onChange={event => actualizarCalificacionFila(fila.id, event.target.value)}
                          className="ml-auto h-8 w-20 text-right text-body-sm tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-0 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          className="w-(--control-height-sm) px-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Quitar a ${fila.nombre}`}
                          onClick={() => quitarFila(fila.id)}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
