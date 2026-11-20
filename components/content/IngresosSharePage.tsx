"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SegmentControl, ShareFilters } from "@/components/content/IngresosShareControls"
import { IngresosSharePreview } from "@/components/content/IngresosSharePreview"
import { IngresosEmployeeSelectionDialog } from "@/components/content/IngresosEmployeeSelectionDialog"
import { usePendingEvals, type EmployeePending } from "@/lib/hooks/usePendingEvals"
import {
  aplicaAlTema, buildEmailMessage, buildWhatsAppMessage, COPY_RESET_DELAY_MS, countVencidas, downloadAsTxt,
  FORMAT_OPTIONS, htmlATexto, nombreArchivo, TEMPLATE_OPTIONS, tieneVencida, TODOS, TOPIC_OPTIONS,
  WA_CHAR_LIMIT, type ShareFormat, type ShareTopic, type TemplateType,
} from "@/lib/ingresos/share-messages"
import { notify } from "@/lib/notify"

const SECTION_TITLE = "text-eyebrow uppercase text-muted-foreground"

/**
 * Compartir pendientes de nuevo ingreso: a la izquierda se arma el mensaje
 * (qué, por dónde y para quién); a la derecha se revisa y se envía.
 */
export function IngresosSharePage() {
  const { loading, deptGroups } = usePendingEvals()
  const [topic, setTopic] = useState<ShareTopic>("evals")
  const [format, setFormat] = useState<ShareFormat>("whatsapp")
  const [template, setTemplate] = useState<TemplateType>("formal")
  const [filterDept, setFilterDept] = useState(TODOS)
  const [filterTurno, setFilterTurno] = useState(TODOS)
  const [urgencySort, setUrgencySort] = useState(false)
  // null: todos los que cumplen los filtros; Set: solo los elegidos a mano.
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const templateId = useId()

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  const departments = useMemo(() => deptGroups.map(group => group.departamento).sort((a, b) => a.localeCompare(b, "es")), [deptGroups])
  const turnos = useMemo(() => [...new Set(deptGroups.flatMap(group => group.items.flatMap(employee => employee.turno ? [employee.turno] : [])))]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true })), [deptGroups])

  const filtered = useMemo<EmployeePending[]>(() => {
    const result = deptGroups
      .filter(group => filterDept === TODOS || group.departamento === filterDept)
      .flatMap(group => group.items)
      .filter(employee => (filterTurno === TODOS || employee.turno === filterTurno) && aplicaAlTema(employee, topic))
    if (!urgencySort) return result
    // sort estable: dentro de cada grupo se conserva el orden original.
    return result.sort((a, b) => Number(tieneVencida(b, topic)) - Number(tieneVencida(a, topic)))
  }, [deptGroups, filterDept, filterTurno, topic, urgencySort])

  const employees = useMemo(
    () => selectedIds ? filtered.filter(employee => selectedIds.has(employee.dbId)) : filtered,
    [filtered, selectedIds],
  )

  const messageOptions = useMemo(
    () => ({ employees, filterDept, filterTurno, template, topic }),
    [employees, filterDept, filterTurno, template, topic],
  )
  const text = useMemo(() => buildWhatsAppMessage(messageOptions), [messageOptions])
  const html = useMemo(() => buildEmailMessage(messageOptions), [messageOptions])
  const vencidas = useMemo(() => countVencidas(employees, topic), [employees, topic])

  function changeTopic(value: ShareTopic) {
    setTopic(value)
    setSelectedIds(null)
  }

  async function copy() {
    try {
      if (format === "email") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([htmlATexto(html)], { type: "text/plain" }),
        })])
      } else {
        await navigator.clipboard.writeText(text)
      }
      setCopied(true)
      notify.success("Copiado al portapapeles")
    } catch {
      notify.error("No se pudo copiar el mensaje.")
    }
  }

  function send() {
    if (text.length > WA_CHAR_LIMIT) {
      notify.error("El mensaje excede el límite de WhatsApp. Reduce la lista primero.")
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  function download() {
    downloadAsTxt(format === "email" ? htmlATexto(html) : text, nombreArchivo(topic))
    notify.success("Archivo descargado")
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-6">
        <section aria-labelledby="share-mensaje" className="grid gap-4">
          <h2 id="share-mensaje" className={SECTION_TITLE}>Mensaje</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <SegmentControl label="Documento" value={topic} onValueChange={changeTopic} options={TOPIC_OPTIONS} />
            <SegmentControl label="Canal" value={format} onValueChange={setFormat} options={FORMAT_OPTIONS} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={templateId}>Plantilla</Label>
            <Select value={template} onValueChange={value => setTemplate(value as TemplateType)}>
              <SelectTrigger id={templateId}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section aria-labelledby="share-destinatarios" className="grid gap-4 border-t border-border pt-6">
          <h2 id="share-destinatarios" className={SECTION_TITLE}>Destinatarios</h2>
          <ShareFilters
            departments={departments} turnos={turnos}
            filterDept={filterDept} onDeptChange={setFilterDept}
            filterTurno={filterTurno} onTurnoChange={setFilterTurno}
            urgencySort={urgencySort} onUrgencySortChange={setUrgencySort} />
          <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-body-md text-foreground">
              <span className="tabular-nums">{employees.length}</span> de <span className="tabular-nums">{filtered.length}</span> empleados
            </p>
            <div className="ml-auto flex items-center gap-1">
              {selectedIds && (
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedIds(null)}>
                  Incluir a todos
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" aria-haspopup="dialog" disabled={loading || !filtered.length}
                onClick={() => setSelecting(true)}>
                Elegir empleados
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* En escritorio la vista previa mide lo mismo que el formulario: el mensaje se desplaza dentro. */}
      <div className="relative min-w-0">
        <IngresosSharePreview
          loading={loading} format={format} text={text} html={html}
          employeeCount={employees.length} vencidasCount={vencidas}
          copied={copied} onCopy={() => void copy()} onSend={send} onDownload={download} />
      </div>

      {selecting && (
        <IngresosEmployeeSelectionDialog
          employees={filtered}
          selectedIds={selectedIds ?? new Set(filtered.map(employee => employee.dbId))}
          topic={topic}
          onClose={() => setSelecting(false)}
          onApply={ids => {
            // Elegir a todos equivale a no tener selección manual.
            setSelectedIds(ids.size === filtered.length ? null : ids)
            setSelecting(false)
          }} />
      )}
    </div>
  )
}
