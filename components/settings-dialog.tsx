"use client"

import { useState } from "react"
import { Palette, SlidersHorizontal, UserRound, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResponsiveShell } from "@/components/ui/responsive-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@/lib/hooks/useUser"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { hasPrivateDeveloperAccess } from "@/lib/auth/private-developer"
import { cn } from "@/lib/utils"
import { AppearanceSettings } from "@/components/content/settings/AppearanceSettings"
import { DeveloperSettings } from "@/components/content/settings/DeveloperSettings"
import { ProfileSettings } from "@/components/content/settings/ProfileSettings"

type Seccion = "perfil" | "apariencia" | "avanzado"

const SECCIONES: { id: Seccion; label: string; icon: LucideIcon }[] = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "avanzado", label: "Avanzado", icon: SlidersHorizontal },
]

/** Configuración en un modal: navegación lateral en tablet y escritorio; pestañas en móvil. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useUser()
  const lateral = useMediaQuery(DESKTOP_QUERY)
  const [seccion, setSeccion] = useState<Seccion>("perfil")
  const advanced = hasPrivateDeveloperAccess(user?.email)
  const secciones = SECCIONES.filter(item => item.id !== "avanzado" || advanced)
  const activa = secciones.find(item => item.id === seccion) ?? secciones[0]
  const close = () => onOpenChange(false)

  return (
    <ResponsiveShell open={open} onClose={close} title="Configuración" description="Tu perfil y cómo se ve la app." size="md">
      <Tabs value={activa.id} onValueChange={value => setSeccion(value as Seccion)} orientation={lateral ? "vertical" : "horizontal"}
        className="flex min-h-0 flex-col md:grid md:h-[min(32rem,85svh)] md:grid-cols-[11rem_minmax(0,1fr)]">
        {/* Móvil: una sola línea base compartida por las pestañas. Tablet y escritorio: barra lateral. */}
        <div className="flex shrink-0 items-end gap-2 border-b pl-(--card-padding) pr-2 pt-2 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:bg-muted/30 md:p-2">
          <TabsList aria-label="Secciones de configuración" className="flex-1 justify-start border-b-0 md:flex-none md:flex-col md:items-stretch md:gap-0.5">
            {secciones.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className={cn(
                "md:mb-0 md:justify-start md:gap-2 md:rounded-md md:border-b-0 md:px-2",
                "md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm",
              )}>
                <Icon aria-hidden="true" className="hidden size-4 shrink-0 md:block" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button type="button" variant="ghost" size="icon" className="mb-1 shrink-0 md:hidden" onClick={close} aria-label="Cerrar configuración">
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-col">
          <header className="hidden shrink-0 items-center justify-between gap-3 border-b py-2 pl-(--card-padding) pr-2 md:flex">
            <h3 className="text-heading-md text-foreground">{activa.label}</h3>
            <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Cerrar configuración">
              <X aria-hidden="true" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-(--card-padding) safe-bottom-content">
            <TabsContent value="perfil" className="mt-0"><ProfileSettings /></TabsContent>
            <TabsContent value="apariencia" className="mt-0"><AppearanceSettings /></TabsContent>
            {advanced && <TabsContent value="avanzado" className="mt-0"><DeveloperSettings onNavigate={close} /></TabsContent>}
          </div>
        </div>
      </Tabs>
    </ResponsiveShell>
  )
}
