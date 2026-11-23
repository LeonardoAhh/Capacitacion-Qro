import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RecontratacionFilters({
  search,
  onSearchChange,
  departments,
  filterDepartment,
  onDepartmentChange,
  hasFilters,
  onClear,
}: {
  search: string
  onSearchChange: (value: string) => void
  departments: string[]
  filterDepartment: string
  onDepartmentChange: (value: string) => void
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="search" aria-label="Filtros de empleados">
      <SearchInput
        label="Buscar empleado"
        placeholder="Nombre, número, puesto…"
        className="w-full sm:w-72"
        value={search}
        onValueChange={onSearchChange}
      />

      <Select value={filterDepartment} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-full gap-2 sm:w-52" aria-label="Filtrar por departamento">
          <Filter className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
    </div>
  )
}
