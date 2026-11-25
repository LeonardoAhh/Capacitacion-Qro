import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Barra de Recontratación: filtro de departamento a la izquierda y paginación a la derecha,
 * en una línea en todos los tamaños. La búsqueda vive en el header (HeaderSearch).
 */
export function RecontratacionFilters({
  departments,
  filterDepartment,
  onDepartmentChange,
  hasFilters,
  onClear,
  pager,
}: {
  departments: string[]
  filterDepartment: string
  onDepartmentChange: (value: string) => void
  hasFilters: boolean
  onClear: () => void
  pager?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select value={filterDepartment} onValueChange={onDepartmentChange}>
        <SelectTrigger className="min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Filtrar por departamento">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Departamentos</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department} value={department}>{department}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Limpiar todos los filtros">
          <X aria-hidden="true" />
          Limpiar
        </Button>
      )}
      <div className="ml-auto shrink-0">{pager}</div>
    </div>
  )
}
