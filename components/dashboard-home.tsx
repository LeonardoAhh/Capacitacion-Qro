"use client"

import Link from "next/link"
import { CalendarDays, ClipboardList } from "lucide-react"
import { useUser, useProfile } from "@/lib/hooks"
import { Button } from "@/components/ui/button"
import { DashboardAlertasProvider } from "@/components/dashboard-alertas-context"
import { CumplimientoProvider } from "@/components/dashboard-cumplimiento-context"
import DashboardAlertas from "@/components/dashboard-alertas"
import DashboardCumplimiento from "@/components/dashboard-cumplimiento"
import DashboardYearlyCompliance from "@/components/dashboard-yearly-compliance"
import RgCumplimientoChart from "@/components/rg-cumplimiento-chart"
import CapacitacionChart from "@/components/capacitacion-chart"
import TrainingHoursKPI from "@/components/training-hours-kpi"

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Greeting Bar ─────────────────────────────────────────────────────────────

function GreetingBar() {
    const { user } = useUser()
    const { profile } = useProfile(user?.id)
    const displayName = profile?.displayName || profile?.firstName || "Bienvenido"

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-tight">{displayName}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                    <Link href="/dnc"><ClipboardList aria-hidden="true" />DNC</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/plan-anual"><CalendarDays aria-hidden="true" />Plan Anual</Link>
                </Button>
            </div>
        </div>
    )
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────



// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
    return (
        <div className="space-y-4">
            <GreetingBar />

            <div className="space-y-4">
                <DashboardAlertas />
                <TrainingHoursKPI />
                <CapacitacionChart />
                <DashboardCumplimiento />
                <RgCumplimientoChart />
                <DashboardYearlyCompliance />
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardHome() {
    return (
        <DashboardAlertasProvider>
            <CumplimientoProvider>
                <DashboardContent />
            </CumplimientoProvider>
        </DashboardAlertasProvider>
    )
}
