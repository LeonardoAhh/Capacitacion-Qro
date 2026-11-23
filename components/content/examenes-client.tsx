"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, BookOpen, Settings2 } from "lucide-react"
import { notify } from "@/lib/notify"
import { useExamenes } from "@/lib/hooks/useExamenes"
import ExamenesContent from "@/components/content/examenes"
import GeneradorExamenContent from "@/components/content/generador-examen"
import ReglasExamenContent from "@/components/content/reglas-examen"
import HistorialExamenesContent from "@/components/content/historial-examenes"
import { History } from "lucide-react"
import { EXAMENES_TABS, type ExamenesTab } from "@/components/content/examenes-tabs"
import { TabsBar, TabsToolbarProvider } from "@/components/ui/tabs-toolbar"

export default function ExamenesClient({ initialTab = "generador" }: { initialTab?: ExamenesTab }) {
  const [tab, setTab] = useState<ExamenesTab>(initialTab)
  // Lazy-mount tabs: only instantiate a tab's heavy hook the first time the
  // user visits it. This avoids running Supabase queries for all tres tabs
  // on /examenes entry.
  const [mounted, setMounted] = useState<Record<ExamenesTab, boolean>>(
    () => Object.fromEntries(EXAMENES_TABS.map((key) => [key, key === initialTab])) as Record<ExamenesTab, boolean>,
  )

  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null)

  return (
    <TabsToolbarProvider value={toolbar}>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const key = v as ExamenesTab
          setTab(key)
          setMounted((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
        }}
        className="w-full"
      >
        {/* Sin márgenes propios: pestañas y contenido usan el mismo margen que el header (WorkspaceContainer).
            La búsqueda y las acciones de cada pestaña van en la misma línea (TabsToolbar). */}
        <TabsBar slotRef={setToolbar}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="generador" className="gap-1.5 flex-1 sm:flex-none">
              <FileText size={14} />
              Generar
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-1.5 flex-1 sm:flex-none">
              <History size={14} />
              Historial
            </TabsTrigger>
            <TabsTrigger value="banco" className="gap-1.5 flex-1 sm:flex-none">
              <BookOpen size={14} />
              Banco
            </TabsTrigger>
            <TabsTrigger value="reglas" className="gap-1.5 flex-1 sm:flex-none">
              <Settings2 size={14} />
              Reglas
            </TabsTrigger>
          </TabsList>
        </TabsBar>

        <TabsContent value="generador" className="mt-0">
          {mounted.generador && <GeneradorExamenContent />}
        </TabsContent>

        <TabsContent value="historial" className="mt-0">
          {mounted.historial && <HistorialExamenesContent />}
        </TabsContent>

        <TabsContent value="banco" className="mt-0">
          {mounted.banco && <BancoTab />}
        </TabsContent>

        <TabsContent value="reglas" className="mt-0">
          {mounted.reglas && <ReglasExamenContent />}
        </TabsContent>
      </Tabs>
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
