"use client";

import { EvaluationWorkspace } from "./desempeno/workspace";
import { EASE_OUT } from "./desempeno/pending-presentation";
import { useEvaluationReducedMotion } from "./desempeno/use-evaluation-motion";
import { PendingLegend, VistaMensual } from "./desempeno/pending-monthly";
import { DepartmentPager } from "./desempeno/department-pager";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingEvals } from "@/lib/hooks/usePendingEvals";
import { useSemestralPendientes } from "@/lib/hooks/useSemestralPendientes";
import { getPeriodosSemestralesRecientes } from "@/lib/catalogo";
import { semestreAEvaluar } from "@/lib/desempeno/ventana-entrega";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DesempenoSemestralPendientes from "./desempeno-semestral-pendientes";
type Vista = "mensual" | "semestral";
export default function DesempenoPendientes() {
  const {
    loading,
    deptGroups,
    totalEmployees,
  } = usePendingEvals();
  const [vista, setVista] = useState<Vista>("mensual");
  const reducedMotion = useEvaluationReducedMotion();
  // RLS limita los departamentos del evaluador.
  // Por defecto, el semestre que corresponde evaluar (en la recepción, el que acaba de cerrar).
  const periodosSemestrales = getPeriodosSemestralesRecientes();
  const [periodoSemestral, setPeriodoSemestral] = useState(semestreAEvaluar());
  const semestrales = useSemestralPendientes(periodoSemestral, null, vista === "semestral");
  // The first available department is the default page for each view.
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const currentTab = deptGroups.some(group => group.departamento === activeTab)
    ? activeTab
    : deptGroups[0]?.departamento ?? null;
  const monthlyIndex = deptGroups.findIndex(group => group.departamento === currentTab);
  const monthlyGroup = deptGroups[monthlyIndex];
  const [monthlyDirection, setMonthlyDirection] = useState<-1 | 1>(1);
  const [semestralTab, setSemestralTab] = useState<string | null>(null);
  const currentSemestralTab = semestrales.deptGroups.some(group => group.departamento === semestralTab)
    ? semestralTab
    : semestrales.deptGroups[0]?.departamento ?? null;
  const semestralIndex = semestrales.deptGroups.findIndex(group => group.departamento === currentSemestralTab);
  const semestralGroup = semestrales.deptGroups[semestralIndex];
  const [semestralDirection, setSemestralDirection] = useState<-1 | 1>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentSelectedId = deptGroups.find(group => group.departamento === currentTab)?.items.some(item => item.dbId === selectedId)
    ? selectedId
    : null;
  const navigateMonthly = (direction: -1 | 1) => {
    const next = deptGroups[monthlyIndex + direction];
    if (!next) return;
    setMonthlyDirection(direction);
    setActiveTab(next.departamento);
    setSelectedId(null);
  };
  const navigateSemestral = (direction: -1 | 1) => {
    const next = semestrales.deptGroups[semestralIndex + direction];
    if (!next) return;
    setSemestralDirection(direction);
    setSemestralTab(next.departamento);
  };
  // Sin contenedor envolvente: a la izquierda el tipo de evaluación; a la derecha, el departamento.
  return <EvaluationWorkspace>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
        <div role="group" aria-label="Tipo de evaluación" className="grid w-full grid-cols-2 gap-2 sm:inline-grid sm:w-auto">
          <Button variant={vista === "mensual" ? "default" : "outline"} onClick={() => setVista("mensual")} aria-pressed={vista === "mensual"}>
            <UserPlus aria-hidden="true" />
            Nuevo ingreso
          </Button>
          <Button variant={vista === "semestral" ? "default" : "outline"} onClick={() => setVista("semestral")} aria-pressed={vista === "semestral"}>
            <CalendarRange aria-hidden="true" />
            Semestrales
          </Button>
        </div>
        {vista === "semestral" && <Select value={periodoSemestral} onValueChange={setPeriodoSemestral}>
          <SelectTrigger variant="ghost" aria-label="Periodo semestral" className="text-label-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodosSemestrales.map((periodo, index) => <SelectItem key={periodo} value={periodo}>{index === 0 ? `${periodo} · Actual` : periodo}</SelectItem>)}
          </SelectContent>
        </Select>}
        </div>
          <div className="flex min-w-0 items-center justify-between gap-4 max-sm:w-full">
            {vista === "mensual" && !loading && totalEmployees > 0 && <PendingLegend />}
            {vista === "mensual" && !loading && deptGroups.length > 1 && monthlyIndex >= 0 && <DepartmentPager
              label={monthlyGroup.departamento}
              index={monthlyIndex}
              total={deptGroups.length}
              previousLabel={deptGroups[monthlyIndex - 1]?.departamento}
              nextLabel={deptGroups[monthlyIndex + 1]?.departamento}
              onPrevious={() => navigateMonthly(-1)}
              onNext={() => navigateMonthly(1)}
            />}
            {vista === "semestral" && !semestrales.loading && semestrales.deptGroups.length > 1 && semestralIndex >= 0 && <DepartmentPager
              label={semestralGroup.departamento}
              index={semestralIndex}
              total={semestrales.deptGroups.length}
              previousLabel={semestrales.deptGroups[semestralIndex - 1]?.departamento}
              nextLabel={semestrales.deptGroups[semestralIndex + 1]?.departamento}
              onPrevious={() => navigateSemestral(-1)}
              onNext={() => navigateSemestral(1)}
            />}
          </div>
      </div>

        {/* Contenido por vista */}
        <AnimatePresence mode="wait">
          {vista === "semestral" ? <motion.div key="semestral" initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -4
          }} transition={{
            duration: 0.2,
            ease: EASE_OUT
          }}>
            <DesempenoSemestralPendientes loading={semestrales.loading} deptGroups={semestrales.deptGroups} activeTab={currentSemestralTab} direction={semestralDirection} />
        </motion.div> : <motion.div key="mensual" initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -4
          }} transition={{
            duration: 0.2,
            ease: EASE_OUT
          }}>
            <VistaMensual loading={loading} deptGroups={deptGroups} totalEmployees={totalEmployees} activeTab={currentTab} direction={monthlyDirection} selectedId={currentSelectedId} onSelectId={setSelectedId} />
        </motion.div>}
      </AnimatePresence>
  </EvaluationWorkspace>;
}
