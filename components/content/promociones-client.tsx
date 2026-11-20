"use client"

import { useEffect } from "react"
import { notify } from "@/lib/notify"
import { usePromociones } from "@/lib/hooks/usePromociones"
import PromocionesContent from "@/components/content/promociones"
import { Skeleton } from "@/components/ui/skeleton"

export default function PromocionesClient() {
    const {
        empleados,
        loading,
        error,
        recargar,
        guardarDesempeño,
        promoverEmpleado,
        guardarExamen,
    } = usePromociones()

    useEffect(() => {
        if (error) notify.error(`Error al cargar datos: ${error}`)
    }, [error])

    return (
        <div className="w-full space-y-4">

            {/* Empleados */}
            {loading && empleados.length === 0 ? (
                <div className="space-y-2">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <div className="hidden md:block rounded-xl border overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                    <div className="flex flex-col gap-2 md:hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-xl" />
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                    Error al cargar datos: {error}
                </div>
            ) : (
                <PromocionesContent
                    empleados={empleados}
                    onDatosActualizados={recargar}
                    guardarDesempeño={guardarDesempeño}
                    promoverEmpleado={promoverEmpleado}
                    guardarExamen={guardarExamen}
                />
            )}
        </div>
    )
}
