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

const horaFormatter = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" })
const fechaFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })

/** "hoy, 09:15", "ayer, 17:40" o "18 nov, 08:02". */
function formatAcceso(iso: string): string {
    const fecha = new Date(iso)
    const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(fecha).setHours(0, 0, 0, 0)) / 86_400_000)
    const dia = dias === 0 ? "hoy" : dias === 1 ? "ayer" : fechaFormatter.format(fecha)
    return `${dia}, ${horaFormatter.format(fecha)}`
}

/**
 * Saludo compacto de las páginas de inicio (heading-md + body-sm): saludo por hora y nombre; debajo,
 * puesto y el inicio de sesión anterior (para notar un acceso que no se reconozca).
 * `actions` va del lado opuesto.
 */
export function GreetingBar({ actions }: { actions?: ReactNode }) {
    const { user } = useUser()
    const { profile } = useProfile(user?.id)
    const saludo = useSaludo()
    const nombre = profile?.firstName || profile?.displayName

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <h2 className="truncate text-heading-md text-foreground">
                    {saludo ?? " "}{saludo && nombre ? `, ${nombre}` : ""}
                </h2>
                {(profile?.puesto || (saludo && profile?.previousAccess)) && <p className="truncate text-body-sm text-muted-foreground">
                    {[profile?.puesto, saludo && profile?.previousAccess && `Último acceso: ${formatAcceso(profile.previousAccess)}`].filter(Boolean).join(" · ")}
                </p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
