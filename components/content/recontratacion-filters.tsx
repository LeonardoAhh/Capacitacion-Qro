"use client"

import { useMemo, type ReactNode } from "react"
import { Building2 } from "lucide-react"
import {
  FilterBar,
  SINGLE_FILTER_OPERATORS,
  type Filter,
  type FilterFieldDef,
} from "@/components/ui/filter-token-bar"

export function RecontratacionFilters({
  departments,
  filterDepartment,
  onDepartmentChange,
  pager,
}: {
  departments: string[]
  filterDepartment: string
  onDepartmentChange: (value: string) => void
  hasFilters?: boolean
  onClear?: () => void
  pager?: ReactNode
}) {
  const fields = useMemo<FilterFieldDef[]>(() => [
    {
      id: "departamento",
      label: "Departamento",
      icon: <Building2 aria-hidden="true" />,
      operators: SINGLE_FILTER_OPERATORS,
      options: departments.map((department) => ({ value: department, label: department })),
    },
  ], [departments])

  const filters = useMemo<Filter[]>(
    () => (filterDepartment !== "all" ? [{ id: "dept", field: "departamento", operator: "is", values: [filterDepartment] }] : []),
    [filterDepartment],
  )

  const handleChange = (next: Filter[]) => {
    const active = next.find((f) => f.field === "departamento")
    onDepartmentChange(active?.values[0] ?? "all")
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <FilterBar
        fields={fields}
        value={filters}
        onChange={handleChange}
        aria-label="Filtros de recontratación"
      />
      {pager && <div className="ml-auto shrink-0">{pager}</div>}
    </div>
  )
}
