"use client"

import { useId, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JsonImportError, JsonPasteStep, JsonReviewHeader } from "@/components/content/plantilla/json-import-step"
import { CATEGORY_META } from "@/lib/constants/incidencias"
import {
  formatMes,
  parseIncidenciasJSON,
  useIncidencias,
  type IncidenciaInsert,
} from "@/lib/hooks/useIncidencias"
import { cn } from "@/lib/utils"

interface EmployeeNameMap {
  [numero: string]: string
}

interface IncidenciasBulkImportProps {
  /** Mapa numero_empleado -> nombre de la plantilla activa para vista previa. */
  employeeNames: EmployeeNameMap
  loadingEmployees?: boolean
}

interface PreviewGroup {
  numero: string
  nombre: string | null
  months: {
    mes: string
    items: IncidenciaInsert[]
  }[]
  totalRecords: number
}

const PLACEHOLDER_JSON = JSON.stringify(
  [{ numero_empleado: "123", mes: "2025-01", "FALTA INJUSTIFICADA": 2, "VACACIÓN": 1 }],
  null,
  2,
)

function buildPreviewGroups(
  records: IncidenciaInsert[],
  names: EmployeeNameMap,
): PreviewGroup[] {
  const map = new Map<string, Map<string, IncidenciaInsert[]>>()

  for (const record of records) {
    if (!map.has(record.numero_empleado)) map.set(record.numero_empleado, new Map())
    const empMap = map.get(record.numero_empleado)!
    if (!empMap.has(record.mes)) empMap.set(record.mes, [])
    empMap.get(record.mes)!.push(record)
  }

  const groups: PreviewGroup[] = []
  for (const [numero, monthsMap] of map) {
    const months = Array.from(monthsMap.entries())
      .map(([mes, items]) => ({ mes, items }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
    groups.push({
      numero,
      nombre: names[numero] ?? null,
      months,
      totalRecords: months.reduce((acc, m) => acc + m.items.length, 0),
    })
  }

  return groups.sort((a, b) => {
    const na = parseInt(a.numero, 10)
    const nb = parseInt(b.numero, 10)
    if (isNaN(na) && isNaN(nb)) return a.numero.localeCompare(b.numero)
    if (isNaN(na)) return 1
    if (isNaN(nb)) return -1
    return na - nb
  })
}

function EmployeePreviewRow({ group }: { group: PreviewGroup }) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const isBaja = group.nombre === null

  return (
    <li className={cn(isBaja && "bg-destructive/5")}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex min-h-(--control-height) w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="w-14 shrink-0 text-body-sm tabular-nums text-muted-foreground">
          #{group.numero}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-body-md",
            isBaja ? "text-destructive" : "text-foreground",
          )}
        >
          {isBaja ? "Baja (excluido)" : group.nombre}
        </span>
        {isBaja ? (
          <Badge variant="destructive" size="sm" className="shrink-0">
            Baja
          </Badge>
        ) : (
          <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">
            {group.months.length} {group.months.length === 1 ? "mes" : "meses"} · {group.totalRecords} reg
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div id={panelId} className="space-y-2.5 border-t border-border bg-muted/20 px-4 py-3">
          {group.months.map(({ mes, items }) => (
            <div key={mes} className="space-y-1.5">
              <p className="text-label-sm text-foreground">{formatMes(mes)}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, idx) => {
                  const meta = CATEGORY_META[item.categoria]
                  return (
                    <span
                      key={`${mes}-${item.categoria}-${idx}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-body-sm",
                        meta?.color,
                      )}
                    >
                      <span>{meta?.shortLabel ?? item.categoria}</span>
                      <span className="text-label-sm tabular-nums">{item.valor}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

/** Carga masiva de incidencias desde JSON en dos pasos: pegado y revisión. */
export function IncidenciasBulkImport({
  employeeNames,
  loadingEmployees = false,
}: IncidenciasBulkImportProps) {
  const { saving, importBulk } = useIncidencias()
  const [jsonText, setJsonText] = useState("")
  const [parseResult, setParseResult] = useState<{
    records: IncidenciaInsert[]
    errors: string[]
  } | null>(null)

  const previewGroups = useMemo(() => {
    if (!parseResult || parseResult.records.length === 0) return []
    return buildPreviewGroups(parseResult.records, employeeNames)
  }, [parseResult, employeeNames])

  const stats = useMemo(() => {
    if (!previewGroups.length) return null
    const employees = previewGroups.length
    const matchedGroups = previewGroups.filter((group) => group.nombre !== null)
    const matched = matchedGroups.length
    const bajas = employees - matched
    const importableRecords = matchedGroups.reduce((acc, group) => acc + group.totalRecords, 0)
    const totalMonths = matchedGroups.reduce((acc, group) => acc + group.months.length, 0)
    return { employees, matched, bajas, importableRecords, totalMonths }
  }, [previewGroups])

  const importableRecords = useMemo(() => {
    if (!parseResult) return []
    const matchedNumbers = new Set(
      previewGroups.filter((group) => group.nombre !== null).map((group) => group.numero),
    )
    return parseResult.records.filter((record) => matchedNumbers.has(record.numero_empleado))
  }, [parseResult, previewGroups])

  const volverAlEditor = () => {
    setParseResult(null)
  }

  const reiniciar = () => {
    setJsonText("")
    setParseResult(null)
  }

  const validar = () => {
    setParseResult(null)
    if (!jsonText.trim()) return
    try {
      const parsed = JSON.parse(jsonText)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      if (arr.length === 0) {
        setParseResult({ records: [], errors: ["JSON vacío."] })
        return
      }
      const result = parseIncidenciasJSON(arr)
      if (result.errors.length === 0 && result.records.length === 0) {
        setParseResult({ records: [], errors: ["No se encontraron categorías válidas en los datos."] })
        return
      }
      setParseResult(result)
    } catch {
      setParseResult({ records: [], errors: ["JSON inválido. Verifica el formato."] })
    }
  }

  const handleImport = async () => {
    if (importableRecords.length === 0) return
    const result = await importBulk(importableRecords)
    if (result.success) reiniciar()
  }

  const employeesMissing = loadingEmployees && Object.keys(employeeNames).length === 0
  const hasParseErrors = Boolean(parseResult && parseResult.errors.length > 0)
  const listo = !hasParseErrors && previewGroups.length > 0 && stats !== null

  if (listo && stats) {
    return (
      <div className="step-enter max-w-4xl space-y-4">
        <JsonReviewHeader
          disabled={saving}
          onBack={volverAlEditor}
          stats={[
            { label: "Activos", value: stats.matched },
            { label: "Meses", value: stats.totalMonths },
            { label: "Registros", value: stats.importableRecords },
            ...(stats.bajas > 0 ? [{ label: "Bajas (excluidas)", value: stats.bajas }] : []),
          ]}
        />

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto scrollbar-thin">
            {previewGroups.map((group) => (
              <EmployeePreviewRow key={group.numero} group={group} />
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={reiniciar}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            loading={saving}
            disabled={saving || importableRecords.length === 0}
            onClick={() => void handleImport()}
          >
            {`Cargar ${stats.importableRecords} ${stats.importableRecords === 1 ? "registro" : "registros"}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <JsonPasteStep
      value={jsonText}
      placeholder={PLACEHOLDER_JSON}
      disabled={saving}
      loading={employeesMissing}
      hasError={hasParseErrors}
      onChange={(next) => {
        setJsonText(next)
        setParseResult(null)
      }}
      onClear={reiniciar}
      onValidate={validar}
      errorSlot={
        hasParseErrors && parseResult ? (
          <JsonImportError title="Corrige los datos antes de cargarlos">
            <ul className="list-disc space-y-0.5 pl-4 text-body-sm">
              {parseResult.errors.map((err, index) => (
                <li key={`${index}-${err}`}>{err}</li>
              ))}
            </ul>
          </JsonImportError>
        ) : undefined
      }
    />
  )
}
