"use client"

import { useEffect, useState } from "react"
import { BookOpen, FileText, History, Settings2 } from "lucide-react"
import { notify } from "@/lib/notify"
import { useExamenes } from "@/lib/hooks/useExamenes"
import ExamenesContent from "@/components/content/examenes"
import GeneradorExamenContent from "@/components/content/generador-examen"
import ReglasExamenContent from "@/components/content/reglas-examen"
import HistorialExamenesContent from "@/components/content/historial-examenes"
import type { ExamenesTab } from "@/components/content/examenes-tabs"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { TabsBar, TabsToolbarProvider } from "@/components/ui/tabs-toolbar"

const SECCIONES: readonly SectionNavItem<ExamenesTab>[] = [
  { id: "generador", label: "Generar", icon: FileText },
  { id: "historial", label: "Historial", icon: History },
  { id: "banco", label: "Banco", icon: BookOpen },
  { id: "reglas", label: "Reglas", icon: Settings2 },
]

export default function ExamenesClient({ initialTab = "generador" }: { initialTab?: ExamenesTab }) {
  const [tab, setTab] = useState<ExamenesTab>(initialTab)
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null)

  // Solo se monta el apartado activo: sus consultas corren al abrirlo.
  return (
    <TabsToolbarProvider value={toolbar}>
      <SectionNavLayout label="Apartados de exámenes" items={SECCIONES} value={tab} onValueChange={setTab}>
        {/* Búsqueda, filtros y acciones del apartado (TabsToolbar) van en esta línea. */}
        <TabsBar slotRef={setToolbar} />
        {tab === "generador" ? (
          <GeneradorExamenContent />
        ) : tab === "historial" ? (
          <HistorialExamenesContent />
        ) : tab === "banco" ? (
          <BancoTab />
        ) : (
          <ReglasExamenContent />
        )}
      </SectionNavLayout>
    </TabsToolbarProvider>
  )
}

function BancoTab() {
  const {
    preguntas,
    loading,
    error,
    buscar,
    crear,
    actualizar,
    eliminar,
    contarTotal,
  } = useExamenes()
  const [totalBanco, setTotalBanco] = useState<number | null>(null)

  useEffect(() => {
    if (error) notify.error(`Error al cargar datos: ${error}`)
  }, [error])

  // Count once on first mount so the empty state can show "N preguntas en el banco".
  useEffect(() => {
    let cancelled = false
    contarTotal().then((n) => {
      if (!cancelled) setTotalBanco(n)
    })
    return () => {
      cancelled = true
    }
  }, [contarTotal])

  return (
    <ExamenesContent
      preguntas={preguntas}
      loading={loading}
      error={error}
      totalBanco={totalBanco}
      onBuscar={buscar}
      onCrear={crear}
      onActualizar={actualizar}
      onEliminar={eliminar}
    />
  )
}
