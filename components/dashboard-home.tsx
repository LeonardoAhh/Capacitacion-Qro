"use client"

import { useState } from "react"
import Link from "next/link"
import { BadgeCheck, CalendarDays, ClipboardList, Clock, GraduationCap, ShieldCheck, TrendingUp } from "lucide-react"
import { GreetingBar } from "@/components/greeting-bar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CumplimientoProvider } from "@/components/dashboard-cumplimiento-context"
import DashboardCumplimiento from "@/components/dashboard-cumplimiento"
import DashboardYearlyCompliance from "@/components/dashboard-yearly-compliance"
import RgCumplimientoChart from "@/components/rg-cumplimiento-chart"
import CapacitacionChart from "@/components/capacitacion-chart"
import TrainingHoursKPI from "@/components/training-hours-kpi"

// ─── Dashboard Content ────────────────────────────────────────────────────────

/** Apartados de Inicio: uno a la vez, elegidos en la barra lateral interna. */
const SECCIONES = [
    { id: "horas", label: "Horas de capacitación", icon: Clock, Panel: TrainingHoursKPI },
    { id: "cursos", label: "Cursos impartidos", icon: GraduationCap, Panel: CapacitacionChart },
    { id: "cumplimiento", label: "Cumplimiento general", icon: BadgeCheck, Panel: DashboardCumplimiento },
    { id: "rg", label: "RG-REC-048", icon: ShieldCheck, Panel: RgCumplimientoChart },
    { id: "ingreso", label: "Por año de ingreso", icon: TrendingUp, Panel: DashboardYearlyCompliance },
] as const

type SeccionId = (typeof SECCIONES)[number]["id"]

function DashboardContent() {
    const [activa, setActiva] = useState<SeccionId>(SECCIONES[0].id)
    const seccion = SECCIONES.find(item => item.id === activa) ?? SECCIONES[0]
    const { Panel } = seccion

    return (
        <div className="space-y-6 dense:space-y-4">
            <GreetingBar actions={<>
                <Button asChild variant="outline">
                    <Link href="/dnc"><ClipboardList aria-hidden="true" />DNC</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/plan-anual"><CalendarDays aria-hidden="true" />Plan Anual</Link>
                </Button>
            </>} />

            <div className="grid items-start gap-6 dense:gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
                <aside className="min-w-0 md:sticky md:top-0">
                    <Select value={activa} onValueChange={value => setActiva(value as SeccionId)}>
                        <SelectTrigger aria-label="Apartado" className="w-full md:hidden"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SECCIONES.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <nav aria-label="Apartados de inicio" className="hidden md:block">
                        <ul className="space-y-0.5">
                            {SECCIONES.map(({ id, label, icon: Icon }) => {
                                const current = id === activa
                                return (
                                    <li key={id}>
                                        <button type="button" aria-current={current || undefined} onClick={() => setActiva(id)}
                                            className={cn("flex min-h-(--control-height-sm) w-full items-center gap-2 rounded-md px-2 text-left text-body-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                                current ? "bg-muted text-label-sm text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                                            <span className="min-w-0 truncate">{label}</span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>
                </aside>

                {/* El nombre del apartado lo da la barra lateral; aquí queda para lectores de pantalla. */}
                <section aria-labelledby="inicio-apartado" className="min-w-0">
                    <h2 id="inicio-apartado" className="sr-only">{seccion.label}</h2>
                    <Panel />
                </section>
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardHome() {
    return (
        <CumplimientoProvider>
            <DashboardContent />
        </CumplimientoProvider>
    )
}
