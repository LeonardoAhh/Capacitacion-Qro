"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MaintenancePreview } from "@/components/maintenance-preview"
import { useMaintenanceMode } from "@/lib/hooks/useMaintenanceMode"
import { notify } from "@/lib/notify"
import { ASSIGNMENTS_PATH } from "@/lib/navigation"
import { SettingsGroup, SettingsRow } from "./SettingsPrimitives"

const UNITS = [
  { value: "60", label: "Minutos" },
  { value: "3600", label: "Horas" },
  { value: "86400", label: "Días" },
]

/** Opciones avanzadas: pausar la app por mantenimiento y asignar evaluadores. */
export function DeveloperSettings({ onNavigate }: { onNavigate?: () => void }) {
  const { isMaintenance, endsAt, toggleMaintenance, loading, saving } = useMaintenanceMode()
  const [duration, setDuration] = useState("30")
  const [unit, setUnit] = useState("60")
  const seconds = Number(duration) * Number(unit)
  const validDuration = duration.trim() !== "" && Number.isFinite(seconds) && seconds >= 60 && seconds <= 365 * 86400
  const busy = loading || saving

  const fin = isMaintenance && endsAt && Number.isFinite(Date.parse(endsAt))
    ? new Date(endsAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : null

  // El resultado se avisa con toast; el modal solo muestra la validación del campo.
  const saveMaintenance = async (active: boolean) => {
    const success = await toggleMaintenance(active, seconds)
    if (success) notify.success(active ? "Mantenimiento activado" : "Mantenimiento desactivado")
    else notify.error("No se pudo actualizar el mantenimiento.")
  }

  return (
    <div className="space-y-4">
      <SettingsGroup title="Mantenimiento">
        <SettingsRow label="Pausar la app" description="Nadie más podrá entrar hasta que lo desactives." htmlFor="maintenance-mode">
          <Switch id="maintenance-mode" checked={isMaintenance} onCheckedChange={saveMaintenance}
            disabled={busy || (!isMaintenance && !validDuration)} />
        </SettingsRow>
        <SettingsRow label="Tiempo estimado" htmlFor="maintenance-duration"
          description={fin ? `Termina aprox. el ${fin}.` : "Se muestra como cuenta regresiva a los usuarios."}>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input id="maintenance-duration" type="number" min="1" step="1" value={duration} onChange={event => setDuration(event.target.value)}
              disabled={busy} aria-invalid={!validDuration} className="w-20" />
            <Select value={unit} onValueChange={setUnit} disabled={busy}>
              <SelectTrigger aria-label="Unidad de tiempo" className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            {isMaintenance && (
              <Button type="button" variant="outline" size="sm" onClick={() => void saveMaintenance(true)} disabled={busy || !validDuration}>
                Reiniciar
              </Button>
            )}
          </div>
        </SettingsRow>
        {!validDuration && <p role="alert" className="py-2 text-body-sm text-destructive">Escribe un tiempo de 1 minuto a 365 días.</p>}
        <SettingsRow label="Vista previa" description="Mira la pantalla que verá el equipo, con el tiempo estimado de arriba. No activa nada.">
          <MaintenancePreview seconds={validDuration ? seconds : null} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Evaluaciones">
        <SettingsRow label="Asignar evaluadores" description="Qué áreas y personas evalúa cada cuenta.">
          <Button asChild variant="outline" size="sm">
            <Link href={ASSIGNMENTS_PATH} onClick={onNavigate}>Abrir<ArrowRight aria-hidden="true" /></Link>
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
