"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { folioExamen, formatFechaExamen, useHistorialExamenes } from "@/lib/hooks/useHistorialExamenes"
import { History, Calendar, FileText, Trash2, Loader2 } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { ExamenesToolbar } from "./examenes-toolbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { examenHojaHref } from "@/components/content/examenes-tabs"

export default function HistorialExamenesContent() {
  const { examenes, loading, error, buscar, eliminar } = useHistorialExamenes()
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Initial fetch
    buscar("")
  }, [buscar])

  return (
    <div className="space-y-6">
      {/* Búsqueda en la línea de las pestañas */}
      <ExamenesToolbar>
        <SearchInput
          label="Buscar exámenes"
          placeholder="Buscar por folio o nombre…"
          className="w-full max-w-sm"
          value={searchTerm}
          onValueChange={setSearchTerm}
          onSearch={buscar}
          loading={loading}
        />
      </ExamenesToolbar>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center py-8">{error}</div>
      ) : examenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed">
          <History size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No se encontraron exámenes</p>
          <p className="text-sm text-center max-w-sm mt-1 opacity-70">
            Los exámenes generados aparecerán aquí para que puedas consultar sus hojas de respuestas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examenes.map((ex) => {
            const folio = folioExamen(ex)
            return (
            // Toda la tarjeta abre la hoja de respuestas (enlace extendido); borrar queda encima.
            <Card
              key={ex.id}
              className="relative transition-colors hover:border-primary/50 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
            >
              <CardContent className="space-y-3 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground">FOLIO</span>
                    <p className="font-sans text-sm">{folio}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">
                      Categoría {ex.categoria_destino}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative z-10 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                          aria-label={`Eliminar examen ${folio}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar examen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el historial de este examen (Folio: {folio}).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={() => eliminar(ex.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div>
                  <Link href={examenHojaHref(ex.id)}
                    className="block truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-[inherit]">
                    {ex.empleado?.nombre ?? "Empleado Desconocido"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    #{ex.empleado?.numero ?? "—"} · {ex.departamento}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatFechaExamen(ex.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText size={12} />
                    <span>{ex.preguntas.length} preguntas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
