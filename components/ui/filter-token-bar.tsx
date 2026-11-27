"use client"

import * as React from "react"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import { Check, Loader2, Plus, X } from "lucide-react"
import { createPortal } from "react-dom"
import { useAppReducedMotion } from "@/components/app-transition"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  glyph?: React.ReactNode
}

export interface FilterOperatorDef {
  value: string
  label: string
  multi?: boolean
}

export interface FilterFieldDef {
  id: string
  label: string
  icon?: React.ReactNode
  operators: FilterOperatorDef[]
  options?: FilterOption[]
  loadOptions?: (query: string) => Promise<FilterOption[]>
}

export interface Filter {
  id: string
  field: string
  operator: string
  values: string[]
  /** Token obligatorio: permite cambiar el valor, pero no quitarlo ni cambiar de campo. */
  locked?: boolean
}

export interface FilterBarProps {
  fields: FilterFieldDef[]
  value: Filter[]
  onChange: (filters: Filter[]) => void
  addLabel?: string
  emptyLabel?: string
  clearLabel?: string
  hideAdd?: boolean
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

export const DEFAULT_FILTER_OPERATORS: FilterOperatorDef[] = [
  { value: "is", label: "es" },
  { value: "is_not", label: "no es" },
  { value: "is_any", label: "es cualquiera de", multi: true },
]

export const SINGLE_FILTER_OPERATORS: FilterOperatorDef[] = [
  { value: "is", label: "es" },
]

/** Evalúa un conjunto de filtros tokenizados contra un lector de valores por campo. */
export function matchesFilterTokens(
  filters: readonly Filter[],
  getValue: (fieldId: string) => string | readonly string[] | null | undefined,
): boolean {
  for (const filter of filters) {
    if (filter.values.length === 0) continue
    const raw = getValue(filter.field)
    const itemValues = Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string" && item.length > 0)
      : raw
        ? [raw]
        : []

    if (filter.operator === "is") {
      if (!itemValues.includes(filter.values[0])) return false
    } else if (filter.operator === "is_not") {
      if (itemValues.includes(filter.values[0])) return false
    } else if (filter.operator === "is_any") {
      if (!filter.values.some((target) => itemValues.includes(target))) return false
    } else if (filter.operator === "is_none") {
      if (filter.values.some((target) => itemValues.includes(target))) return false
    }
  }
  return true
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f_${Math.random().toString(36).slice(2, 9)}`

const springy: Transition = { type: "spring", stiffness: 560, damping: 34, mass: 0.7 }

const normalizeSearch = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX")

function fieldById(fields: FilterFieldDef[], id: string) {
  return fields.find((f) => f.id === id)
}

function operatorByValue(field: FilterFieldDef | undefined, value: string) {
  return field?.operators.find((o) => o.value === value)
}

function summarize(
  options: FilterOption[] | undefined,
  values: string[],
): { text: string; empty: boolean; glyphs: React.ReactNode[] } {
  if (!values.length) return { text: "Seleccionar…", empty: true, glyphs: [] }
  const find = (v: string) => options?.find((o) => o.value === v)
  const label = (v: string) => find(v)?.label ?? v

  const glyphs = values
    .map((v) => find(v)?.glyph)
    .filter(Boolean)
    .slice(0, 3) as React.ReactNode[]

  if (values.length === 1) return { text: label(values[0]), empty: false, glyphs }
  if (values.length <= 2) return { text: values.map(label).join(", "), empty: false, glyphs }
  return {
    text: `${label(values[0])} +${values.length - 1}`,
    empty: false,
    glyphs,
  }
}

interface PopoverProps {
  anchorKey: string
  ariaLabel: string
  onClose: () => void
  children: React.ReactNode
}

function Popover({ anchorKey, ariaLabel, onClose, children }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduce = useAppReducedMotion()
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const [pos, setPos] = React.useState<{ top: number; left: number; minWidth: number; side: "bottom" | "top" } | null>(null)

  React.useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-fb-anchor="${anchorKey}"]`)
    setAnchor(el)
  }, [anchorKey])

  const keyRef = React.useRef(anchorKey)
  keyRef.current = anchorKey
  React.useEffect(
    () => () => {
      document.querySelector<HTMLElement>(`[data-fb-anchor="${keyRef.current}"]`)?.focus()
    },
    [],
  )

  React.useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const el = ref.current
      if (!el) return
      const tokenEl = anchor.closest<HTMLElement>("[data-fb-token]")
      const box = (tokenEl ?? anchor).getBoundingClientRect()
      const minWidth = Math.round(box.width)
      const w = Math.max(el.offsetWidth, minWidth)
      const h = el.offsetHeight
      const gap = 6
      let left = Math.min(box.left, window.innerWidth - w - 8)
      left = Math.max(8, left)
      let top = box.bottom + gap
      let side: "bottom" | "top" = "bottom"
      if (top + h > window.innerHeight - 8) {
        top = Math.max(8, box.top - gap - h)
        side = "top"
      }
      setPos({ top, left, minWidth, side })
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [anchor])

  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        !(anchor && anchor.contains(e.target as Node))
      ) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("pointerdown", onDown, true)
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      document.removeEventListener("keydown", onKey, true)
    }
  }, [anchor, onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      data-side={pos?.side ?? "bottom"}
      aria-label={ariaLabel}
      initial={reduce ? false : { opacity: 0, y: pos?.side === "top" ? 3 : -3, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.13, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        minWidth: pos ? Math.max(pos.minWidth, 120) : undefined,
        zIndex: 50,
      }}
      className="max-w-[min(18.5rem,calc(100vw-1rem))] overflow-hidden ui-floating-surface bg-popover text-popover-foreground"
    >
      {children}
    </motion.div>,
    document.body,
  )
}

interface ListItem {
  value: string
  label: string
  glyph?: React.ReactNode
  selected?: boolean
}

interface SearchListProps {
  items: ListItem[]
  multi: boolean
  loading?: boolean
  error?: boolean
  searchable?: boolean
  placeholder?: string
  ariaLabel: string
  onQuery?: (q: string) => void
  onPick: (value: string) => void
  onRetry?: () => void
}

function SearchList({
  items,
  multi,
  loading,
  error,
  searchable = true,
  placeholder = "Buscar…",
  ariaLabel,
  onQuery,
  onPick,
  onRetry,
}: SearchListProps) {
  const [q, setQ] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listId = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const filtered = React.useMemo(() => {
    if (onQuery) return items
    const needle = normalizeSearch(q.trim())
    if (!needle) return items
    return items.filter((item) => normalizeSearch(item.label).includes(needle))
  }, [items, q, onQuery])

  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (searchable) inputRef.current?.focus()
      else listRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [searchable])

  React.useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  const commit = (i: number) => {
    const item = filtered[i]
    if (item) onPick(item.value)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Home") {
      e.preventDefault()
      setActive(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setActive(filtered.length - 1)
    } else if (e.key === "Enter") {
      e.preventDefault()
      commit(active)
    }
  }

  return (
    <div className={cn(searchable && "min-w-[13rem]")}>
      {searchable && (
        <div className="border-b border-border p-1.5">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            aria-label={ariaLabel}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              onQuery?.(e.target.value)
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="focus-inset w-full rounded-sm bg-transparent px-2 py-1 text-body-sm text-foreground placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-multiselectable={multi || undefined}
        aria-label={ariaLabel}
        className="max-h-60 overflow-y-auto overscroll-contain p-1"
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        {loading && (
          <li className="flex items-center gap-2 px-2 py-3 text-body-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Cargando opciones…
          </li>
        )}

        {error && !loading && (
          <li className="px-2 py-2.5 text-body-sm">
            <p className="text-muted-foreground">No se pudieron cargar las opciones.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 rounded-sm px-1.5 py-0.5 text-body-sm font-medium text-primary underline underline-offset-2"
            >
              Reintentar
            </button>
          </li>
        )}

        {!loading && !error && filtered.length === 0 && (
          <li className="px-2 py-3 text-body-sm text-muted-foreground">
            Sin coincidencias
          </li>
        )}

        {!loading &&
          !error &&
          filtered.map((item, i) => {
            const isActive = i === active
            return (
              <li
                key={item.value}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={multi ? Boolean(item.selected) : isActive}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(item.value)}
                className={cn(
                  "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body-sm text-foreground transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "bg-transparent",
                )}
              >
                {multi && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      item.selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card",
                    )}
                  >
                    {item.selected && <Check className="size-3" />}
                  </span>
                )}
                {item.glyph && (
                  <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4" aria-hidden="true">
                    {item.glyph}
                  </span>
                )}
                <span className={cn("min-w-0 flex-1 truncate", item.selected && "font-medium")}>
                  {item.label}
                </span>
                {!multi && item.selected && (
                  <Check className="ml-auto size-4 shrink-0 text-primary" aria-hidden="true" />
                )}
              </li>
            )
          })}
      </ul>
    </div>
  )
}

interface SegmentProps {
  role: "field" | "operator" | "value"
  children: React.ReactNode
  onOpen: () => void
  registerRef: (el: HTMLButtonElement | null) => void
  tabIndex: number
  ariaLabel: string
  anchorKey: string
  onFocus: () => void
  muted?: boolean
  active?: boolean
  flash?: boolean
}

function Segment({
  role,
  children,
  onOpen,
  registerRef,
  tabIndex,
  ariaLabel,
  anchorKey,
  onFocus,
  muted,
  active,
  flash,
}: SegmentProps) {
  return (
    <button
      type="button"
      ref={registerRef}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={active}
      data-fb-anchor={anchorKey}
      onFocus={onFocus}
      onClick={onOpen}
      className={cn(
        "focus-inset relative flex items-center gap-1.5 whitespace-nowrap px-2.5 text-body-sm transition-colors",
        muted ? "text-muted-foreground" : "text-foreground",
        active ? "bg-accent" : "hover:bg-accent/60",
        role === "field" && "rounded-l-md font-medium",
        flash && "fb-flash-active",
      )}
    >
      {children}
    </button>
  )
}

type OpenState =
  | { kind: "add" }
  | { kind: "field"; filterId: string }
  | { kind: "operator"; filterId: string }
  | { kind: "value"; filterId: string }
  | null

/** Barra unificada de filtros en tokens editables con teclado y soporte multi-selección. */
export function FilterBar({
  fields,
  value,
  onChange,
  addLabel = "Filtrar",
  emptyLabel = "Filtrar",
  clearLabel = "Limpiar",
  hideAdd = false,
  disabled,
  className,
  "aria-label": ariaLabel = "Filtros",
}: FilterBarProps) {
  const reduce = useAppReducedMotion()
  const [open, setOpen] = React.useState<OpenState>(null)
  const [draftFilter, setDraftFilter] = React.useState<Filter | null>(null)
  const [flashId, setFlashId] = React.useState<string | null>(null)

  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [focusIdx, setFocusIdx] = React.useState(0)

  const [asyncState, setAsyncState] = React.useState<
    Record<string, { loading: boolean; error: boolean; options: FilterOption[] }>
  >({})

  const visibleFilters = React.useMemo(
    () => (draftFilter ? [...value, draftFilter] : value),
    [value, draftFilter],
  )

  const singleFieldSingleOp = fields.length === 1 && (fields[0]?.operators.length ?? 0) <= 1
  const canAddMore = !hideAdd && fields.length > 0 && !(singleFieldSingleOp && visibleFilters.length >= 1)

  const itemMeta: { filterId?: string; kind: string; locked?: boolean }[] = []
  visibleFilters.forEach((f) => {
    const field = fieldById(fields, f.field)
    if (!f.locked && fields.length > 1) itemMeta.push({ filterId: f.id, kind: "field", locked: f.locked })
    if ((field?.operators.length ?? 0) > 1) itemMeta.push({ filterId: f.id, kind: "operator", locked: f.locked })
    itemMeta.push({ filterId: f.id, kind: "value", locked: f.locked })
    if (!f.locked) itemMeta.push({ filterId: f.id, kind: "remove", locked: f.locked })
  })
  if (canAddMore) itemMeta.push({ kind: "add" })

  React.useEffect(() => {
    if (focusIdx > itemMeta.length - 1) setFocusIdx(Math.max(0, itemMeta.length - 1))
  }, [itemMeta.length, focusIdx])

  const focusItem = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, itemMeta.length - 1))
    setFocusIdx(clamped)
    itemRefs.current[clamped]?.focus()
  }

  // Al cerrar un popover sin confirmar valor, descarta el borrador o token vacío.
  const closePopover = React.useCallback(() => {
    setDraftFilter(null)
    setOpen((current) => {
      if (current?.kind === "value") {
        const target = value.find((f) => f.id === current.filterId)
        if (target && target.values.length === 0) {
          onChange(value.filter((f) => f.id !== current.filterId))
        }
      }
      return null
    })
  }, [onChange, value])

  const removeFilter = (filterId: string, atIdx?: number) => {
    if (draftFilter?.id === filterId) {
      setDraftFilter(null)
    } else {
      onChange(value.filter((f) => f.id !== filterId))
    }
    setOpen(null)
    const target = Math.max(0, (atIdx ?? focusIdx) - 1)
    requestAnimationFrame(() => focusItem(target))
  }

  const onToolbarKeyDown = (e: React.KeyboardEvent) => {
    if (open) return
    const last = itemMeta.length - 1
    if (e.key === "ArrowRight") {
      e.preventDefault()
      focusItem(focusIdx >= last ? 0 : focusIdx + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focusItem(focusIdx <= 0 ? last : focusIdx - 1)
    } else if (e.key === "Home") {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === "End") {
      e.preventDefault()
      focusItem(last)
    } else if (e.key === "Backspace" || e.key === "Delete") {
      const meta = itemMeta[focusIdx]
      if (meta?.filterId && !meta.locked) {
        e.preventDefault()
        removeFilter(meta.filterId, focusIdx)
      }
    }
  }

  const addFilter = (fieldId: string) => {
    const field = fieldById(fields, fieldId)
    if (!field) return
    const filter: Filter = {
      id: uid(),
      field: fieldId,
      operator: field.operators[0]?.value ?? "is",
      values: [],
    }
    setDraftFilter(filter)
    setOpen({ kind: "value", filterId: filter.id })
  }

  const changeField = (filterId: string, fieldId: string) => {
    const field = fieldById(fields, fieldId)
    const nextOp = field?.operators[0]?.value ?? "is"
    if (draftFilter?.id === filterId) {
      setDraftFilter({ ...draftFilter, field: fieldId, operator: nextOp, values: [] })
    } else {
      onChange(
        value.map((f) =>
          f.id === filterId
            ? { ...f, field: fieldId, operator: nextOp, values: [] }
            : f,
        ),
      )
    }
    setOpen({ kind: "value", filterId })
  }

  const changeOperator = (filterId: string, opValue: string) => {
    const filter = visibleFilters.find((f) => f.id === filterId)
    const field = fieldById(fields, filter?.field ?? "")
    const nextOp = operatorByValue(field, opValue)
    if (draftFilter?.id === filterId) {
      setDraftFilter({ ...draftFilter, operator: opValue, values: nextOp?.multi ? draftFilter.values : draftFilter.values.slice(0, 1) })
    } else {
      onChange(
        value.map((f) =>
          f.id === filterId
            ? {
                ...f,
                operator: opValue,
                values: nextOp?.multi ? f.values : f.values.slice(0, 1),
              }
            : f,
        ),
      )
    }
    setOpen(null)
  }

  const toggleValue = (filterId: string, optionValue: string, multi: boolean) => {
    if (draftFilter?.id === filterId) {
      const nextFilter: Filter = { ...draftFilter, values: [optionValue] }
      setDraftFilter(null)
      onChange([...value, nextFilter])
    } else {
      onChange(
        value.map((f) => {
          if (f.id !== filterId) return f
          if (!multi) return { ...f, values: [optionValue] }
          const has = f.values.includes(optionValue)
          return {
            ...f,
            values: has ? f.values.filter((v) => v !== optionValue) : [...f.values, optionValue],
          }
        }),
      )
    }
    setFlashId(filterId)
    window.setTimeout(() => setFlashId((c) => (c === filterId ? null : c)), 640)
    if (!multi) setOpen(null)
  }

  const clearAll = () => {
    setDraftFilter(null)
    onChange(value.filter((f) => f.locked))
    setOpen(null)
    requestAnimationFrame(() => focusItem(0))
  }

  const ensureOptions = React.useCallback((field: FilterFieldDef, query = "") => {
    if (!field.loadOptions) return
    setAsyncState((s) => ({
      ...s,
      [field.id]: { loading: true, error: false, options: s[field.id]?.options ?? [] },
    }))
    field
      .loadOptions(query)
      .then((options) =>
        setAsyncState((s) => ({
          ...s,
          [field.id]: { loading: false, error: false, options },
        })),
      )
      .catch(() =>
        setAsyncState((s) => ({
          ...s,
          [field.id]: { loading: false, error: true, options: [] },
        })),
      )
  }, [])

  React.useEffect(() => {
    if (!open || open.kind !== "value") return
    const filter = visibleFilters.find((f) => f.id === open.filterId)
    const field = fieldById(fields, filter?.field ?? "")
    if (field?.loadOptions && !asyncState[field.id]?.options.length) {
      ensureOptions(field)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  let itemIndex = 0
  const nextRef = () => {
    const idx = itemIndex++
    return {
      idx,
      register: (el: HTMLButtonElement | null) => {
        itemRefs.current[idx] = el
      },
      tabIndex: idx === focusIdx ? 0 : -1,
      onFocus: () => setFocusIdx(idx),
    }
  }

  const anchorKey = !open
    ? null
    : open.kind === "add"
      ? "add"
      : `${open.filterId}:${open.kind}`

  const popoverAriaLabel = !open
    ? ""
    : open.kind === "add" || open.kind === "field"
      ? "Elegir campo"
      : open.kind === "operator"
        ? "Elegir condición"
        : "Elegir valor"

  const openPopoverContent = () => {
    if (!open) return null

    if (open.kind === "add" || open.kind === "field") {
      const items: ListItem[] = fields.map((f) => ({
        value: f.id,
        label: f.label,
        glyph: f.icon,
      }))
      return (
        <SearchList
          key={anchorKey}
          ariaLabel="Buscar campo de filtro"
          items={items}
          multi={false}
          searchable={items.length > 5}
          onPick={(v) => (open.kind === "add" ? addFilter(v) : changeField(open.filterId, v))}
        />
      )
    }

    const filter = visibleFilters.find((f) => f.id === open.filterId)
    const field = fieldById(fields, filter?.field ?? "")
    if (!filter || !field) return null

    if (open.kind === "operator") {
      const items: ListItem[] = field.operators.map((o) => ({
        value: o.value,
        label: o.label,
        selected: o.value === filter.operator,
      }))
      return (
        <SearchList
          key={anchorKey}
          ariaLabel="Condición del filtro"
          items={items}
          multi={false}
          searchable={items.length > 6}
          onPick={(v) => changeOperator(filter.id, v)}
        />
      )
    }

    const op = operatorByValue(field, filter.operator)
    const multi = Boolean(op?.multi)
    const async = field.loadOptions ? asyncState[field.id] : undefined
    const source = field.loadOptions ? async?.options ?? [] : field.options ?? []
    const items: ListItem[] = source.map((o) => ({
      value: o.value,
      label: o.label,
      glyph: o.glyph,
      selected: filter.values.includes(o.value),
    }))

    return (
      <SearchList
        key={anchorKey}
        ariaLabel={`Opciones de ${field.label}`}
        items={items}
        multi={multi}
        searchable={Boolean(field.loadOptions) || items.length > 6}
        loading={async?.loading}
        error={async?.error}
        onQuery={field.loadOptions ? (q) => ensureOptions(field, q) : undefined}
        onRetry={() => ensureOptions(field)}
        onPick={(v) => toggleValue(filter.id, v, multi)}
      />
    )
  }

  const showClear = value.filter((f) => !f.locked).length > 1

  const handleAddClick = () => {
    if (fields.length === 1) {
      addFilter(fields[0].id)
      return
    }
    setOpen({ kind: "add" })
  }

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      onKeyDown={onToolbarKeyDown}
      className={cn(
        "flex flex-wrap items-center gap-2",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visibleFilters.map((filter) => {
          const field = fieldById(fields, filter.field)
          const op = operatorByValue(field, filter.operator)
          const summary = summarize(
            field?.loadOptions ? asyncState[field.id]?.options : field?.options,
            filter.values,
          )
          const hasOperators = (field?.operators.length ?? 0) > 0
          const canChangeField = !filter.locked && fields.length > 1
          const canChangeOp = (field?.operators.length ?? 0) > 1
          const fieldItem = canChangeField ? nextRef() : null
          const opItem = canChangeOp ? nextRef() : null
          const valueItem = nextRef()
          const removeItem = !filter.locked ? nextRef() : null
          const isFlashing = flashId === filter.id

          return (
            <motion.div
              key={filter.id}
              data-fb-token=""
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={springy}
              className="group flex h-(--control-height-sm) items-stretch overflow-hidden rounded-md border border-border bg-card"
            >
              {canChangeField && fieldItem ? (
                <Segment
                  role="field"
                  registerRef={fieldItem.register}
                  tabIndex={fieldItem.tabIndex}
                  onFocus={fieldItem.onFocus}
                  anchorKey={`${filter.id}:field`}
                  active={open?.kind === "field" && open.filterId === filter.id}
                  ariaLabel={`Campo: ${field?.label ?? filter.field}. Cambiar campo.`}
                  onOpen={() => setOpen({ kind: "field", filterId: filter.id })}
                >
                  {field?.icon && (
                    <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-3.5" aria-hidden="true">
                      {field.icon}
                    </span>
                  )}
                  <span>{field?.label ?? filter.field}</span>
                </Segment>
              ) : (
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-l-md px-2.5 text-body-sm font-medium text-muted-foreground">
                  {field?.icon && (
                    <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-3.5" aria-hidden="true">
                      {field.icon}
                    </span>
                  )}
                  <span>{field?.label ?? filter.field}</span>
                </span>
              )}

              {hasOperators && (
                <>
                  <span aria-hidden="true" className="w-px self-stretch bg-border" />
                  {canChangeOp && opItem ? (
                    <Segment
                      role="operator"
                      registerRef={opItem.register}
                      tabIndex={opItem.tabIndex}
                      onFocus={opItem.onFocus}
                      anchorKey={`${filter.id}:operator`}
                      muted
                      active={open?.kind === "operator" && open.filterId === filter.id}
                      ariaLabel={`Condición: ${op?.label ?? filter.operator}. Cambiar condición.`}
                      onOpen={() => setOpen({ kind: "operator", filterId: filter.id })}
                    >
                      {op?.label ?? filter.operator}
                    </Segment>
                  ) : (
                    <span className="flex items-center whitespace-nowrap px-2 text-body-sm text-muted-foreground">
                      {op?.label ?? filter.operator}
                    </span>
                  )}
                </>
              )}

              <span aria-hidden="true" className="w-px self-stretch bg-border" />

              <Segment
                role="value"
                registerRef={valueItem.register}
                tabIndex={valueItem.tabIndex}
                onFocus={valueItem.onFocus}
                anchorKey={`${filter.id}:value`}
                muted={summary.empty}
                active={open?.kind === "value" && open.filterId === filter.id}
                flash={isFlashing}
                ariaLabel={`${field?.label ?? filter.field}: ${summary.empty ? "sin seleccionar" : summary.text}. Cambiar valor.`}
                onOpen={() => setOpen({ kind: "value", filterId: filter.id })}
              >
                {!summary.empty && summary.glyphs.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1 [&_svg]:size-3.5" aria-hidden="true">
                    {summary.glyphs.map((glyph, i) => (
                      <span key={i} className="flex items-center">
                        {glyph}
                      </span>
                    ))}
                  </span>
                )}
                <span className={cn("max-w-[16rem] truncate", summary.empty ? "font-normal text-muted-foreground" : "font-medium text-foreground")}>
                  {summary.text}
                </span>
              </Segment>

              {removeItem && (
                <>
                  <span aria-hidden="true" className="w-px self-stretch bg-border" />
                  <button
                    type="button"
                    ref={removeItem.register}
                    tabIndex={removeItem.tabIndex}
                    onFocus={removeItem.onFocus}
                    onClick={() => removeFilter(filter.id, removeItem.idx)}
                    aria-label={`Quitar filtro de ${field?.label ?? filter.field}`}
                    className="focus-inset flex items-center px-2 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {canAddMore && (() => {
        const addItem = nextRef()
        const isEmpty = value.length === 0
        return (
          <button
            type="button"
            ref={addItem.register}
            tabIndex={addItem.tabIndex}
            onFocus={addItem.onFocus}
            data-fb-anchor="add"
            aria-label={isEmpty ? emptyLabel : addLabel}
            aria-haspopup="listbox"
            aria-expanded={open?.kind === "add"}
            onClick={handleAddClick}
            className="relative touch-target flex h-(--control-height-sm) items-center gap-1.5 rounded-md border border-dashed border-border bg-card/50 px-2.5 text-body-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:bg-accent/60 hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span>{isEmpty ? emptyLabel : addLabel}</span>
          </button>
        )
      })()}

      {showClear && (
        <button
          type="button"
          onClick={clearAll}
          className="relative touch-target flex h-(--control-height-sm) items-center gap-1 rounded-md px-2 text-body-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
          <span>{clearLabel}</span>
        </button>
      )}

      {open && anchorKey && (
        <Popover anchorKey={anchorKey} ariaLabel={popoverAriaLabel} onClose={closePopover}>
          {openPopoverContent()}
        </Popover>
      )}
    </div>
  )
}

export default FilterBar
