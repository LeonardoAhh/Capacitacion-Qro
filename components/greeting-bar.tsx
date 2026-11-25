"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useUser, useProfile } from "@/lib/hooks"

/** Saludo según la hora local: mañana desde las 5, tarde desde las 12 y noche desde las 19. */
function saludoPorHora(hora: number): string {
    if (hora >= 5 && hora < 12) return "Buenos días"
    if (hora >= 12 && hora < 19) return "Buenas tardes"
    return "Buenas noches"
}

/** Se calcula en el navegador: en el servidor la hora no es la del usuario. */
function useSaludo(): string | null {
    const [saludo, setSaludo] = useState<string | null>(null)
    useEffect(() => {
        const actualizar = () => setSaludo(saludoPorHora(new Date().getHours()))
        actualizar()
        const intervalo = window.setInterval(actualizar, 60_000)
        return () => window.clearInterval(intervalo)
    }, [])
    return saludo
}

/** Saludo limpio de Inicio con accesos directos del lado opuesto. */
export function GreetingBar({ actions }: { actions?: ReactNode }) {
    const { user } = useUser()
    const { profile } = useProfile(user?.id)
    const saludo = useSaludo()
    const nombre = profile?.firstName || profile?.displayName

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="min-w-0 truncate text-heading-md text-foreground">
                {saludo ?? "\u00A0"}{saludo && nombre ? `, ${nombre}` : ""}
            </h2>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
