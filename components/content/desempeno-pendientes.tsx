"use client";

import { SectionTitle } from "./desempeno/presentation";
import { EvaluationWorkspace } from "./desempeno/workspace";
import { EASE_OUT } from "./desempeno/pending-presentation";
import { useEvaluationReducedMotion } from "./desempeno/use-evaluation-motion";
import { VistaMensual } from "./desempeno/pending-monthly";
import { DepartmentPager } from "./desempeno/department-pager";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePendingEvals } from "@/lib/hooks/usePendingEvals";
import { useSemestralPendientes } from "@/lib/hooks/useSemestralPendientes";
import { PERIODOS_DESEMPENO } from "@/lib/catalogo";
import DesempenoSemestralPendientes from "./desempeno-semestral-pendientes";
type Vista = "mensual" | "semestral";
interface Props {
  /** Optional department filter for administrative views; RLS scopes evaluators. */
  filterDepartamentos?: string[] | null;
  periodoSemestral?: string;
}
export default function DesempenoPendientes({
  filterDepartamentos,
  periodoSemestral
}: Props = {}) {
  const {
    loading,
    deptGroups,
    totalEmployees,
  } = usePendingEvals(filterDepartamentos);
  const [vista, setVista] = useState<Vista>("mensual");
  const reducedMotion = useEvaluationReducedMotion();
  const periodoActual = periodoSemestral ?? PERIODOS_DESEMPENO.semestrales[0];
  const semestrales = useSemestralPendientes(periodoActual, filterDepartamentos, vista === "semestral");
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
  return <EvaluationWorkspace section="pending"><Card>
      {/* Header */}
      <CardHeader className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <SectionTitle>Evaluaciones pendientes</SectionTitle>
          <div className="min-w-0">
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
    </CardHeader>

      <CardContent className="space-y-4 p-6 pt-0">
        {/* Toggle de vista */}
        <div role="group" aria-label="Tipo de evaluación" className="grid grid-cols-2 gap-2 sm:inline-grid">
          <Button variant={vista === "mensual" ? "default" : "outline"} onClick={() => setVista("mensual")} aria-pressed={vista === "mensual"}>
            <UserPlus aria-hidden="true" />
            Nuevo ingreso
          </Button>
          <Button variant={vista === "semestral" ? "default" : "outline"} onClick={() => setVista("semestral")} aria-pressed={vista === "semestral"}>
            <CalendarRange aria-hidden="true" />
            Semestrales
          </Button>
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
    </CardContent>
  </Card></EvaluationWorkspace>;
}
