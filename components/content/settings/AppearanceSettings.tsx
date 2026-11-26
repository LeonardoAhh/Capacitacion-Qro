"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/theme-context"
import { isDensity, isThemeMode, THEME_MODE_LABELS, type Density, type FontSize } from "@/lib/theme/constants"
import { SettingsGroup, SettingsRow } from "./SettingsPrimitives"

const FONT_SIZES: Record<FontSize, string> = { small: "Pequeño", medium: "Normal", large: "Grande" }
const DENSITIES: Record<Density, string> = { auto: "Automática", compact: "Compacta" }
const CONTROL = "w-full sm:w-40"

export function AppearanceSettings() {
  const { fontSize, density, reducedMotion, themeMode, setThemeMode, setFontSize, setDensity, setReducedMotion, resetTheme } = useTheme()

  return (
    <div className="space-y-4">
      <SettingsGroup>
        <SettingsRow label="Tema" description="Sistema usa el de tu dispositivo." htmlFor="theme-mode">
          <Select value={themeMode} onValueChange={value => { if (isThemeMode(value)) setThemeMode(value) }}>
            <SelectTrigger id="theme-mode" className={CONTROL}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(THEME_MODE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Tamaño del texto" htmlFor="font-size">
          <Select value={fontSize} onValueChange={value => { if (value in FONT_SIZES) setFontSize(value as FontSize) }}>
            <SelectTrigger id="font-size" className={CONTROL}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FONT_SIZES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Espacio entre elementos" description="Automática lo reduce en pantallas bajas." htmlFor="display-density">
          <Select value={density} onValueChange={value => { if (isDensity(value)) setDensity(value) }}>
            <SelectTrigger id="display-density" className={CONTROL}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DENSITIES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Reducir animaciones" description="Menos movimiento al cambiar de pantalla." htmlFor="reduced-motion">
          <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
        </SettingsRow>
      </SettingsGroup>

      <Button type="button" variant="ghost" size="sm" onClick={resetTheme}>Volver a los valores iniciales</Button>
    </div>
  )
}
