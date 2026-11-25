/**
 * Single source of truth for theme tokens shared by:
 * - app/layout.tsx (pre-hydration display settings and status-bar color)
 * - components/theme-context.tsx (client-side display preferences)
 *
 * This module must stay framework-free (no "use client", no React) so it can
 * be imported from both server and client code.
 */

export type FontSize = "small" | "medium" | "large"
/** auto: compacta solo en escritorio con poca altura (globals.css, variante `dense`). */
export type Density = "auto" | "comfortable" | "compact"

export function isDensity(value: string | null): value is Density {
  return value === "auto" || value === "comfortable" || value === "compact"
}

/** Clase en <html> de cada densidad; "auto" no lleva clase y lo decide la pantalla. */
export const DENSITY_CLASSES: Record<Density, string | null> = {
  auto: null,
  comfortable: "density-comfortable",
  compact: "density-compact",
}
export type ResolvedThemeMode = "light" | "dark"
export type ThemeMode = ResolvedThemeMode | "system"

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
}

// localStorage persistence keys. Written/read by both the bootstrap script
// (before hydration) and ThemeProvider effects — change together via this map.
export const THEME_STORAGE_KEYS = {
  colorMode: "theme",
  legacyAccentColor: "accentColor",
  fontSize: "fontSize",
  density: "densityMode",
  // Antes solo había cómoda/compacta y la cómoda se guardaba sola: de esa
  // clave solo se conserva "compact"; lo demás pasa a "auto".
  legacyDensity: "density",
  reducedMotion: "reducedMotion",
} as const

// Color de la barra de estado / navegador: igual a --card, el fondo del header,
// para que la barra y el header se vean como una sola superficie.
// La meta theme-color no acepta variables CSS; actualizar junto con --card en globals.css.
export const APP_THEME_COLORS: Record<ResolvedThemeMode, string> = {
  light: "#ffffff",
  dark: "#1a1d23",
}

/**
 * Inline script injected into <head> so persisted theme preferences apply
 * synchronously before React hydrates (prevents FOUC). Keep the logic here
 * in sync with the effects in ThemeProvider — both read the same constants,
 * so token changes propagate automatically.
 */
export function buildThemeBootstrapScript(): string {
  const fontSizes = JSON.stringify(FONT_SIZE_MAP)
  const themeColors = JSON.stringify(APP_THEME_COLORS)
  const densityClasses = JSON.stringify(DENSITY_CLASSES)
  const k = JSON.stringify(THEME_STORAGE_KEYS)

  return `(function(){try{
  var d=document.documentElement;
  var fs=${fontSizes};
  var tc=${themeColors};
  var k=${k};
  var p=localStorage.getItem(k.colorMode);
  if(p!=="light"&&p!=="dark"&&p!=="system")p="system";
  var t=p==="dark"?"dark":p==="light"?"light":window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  d.classList.toggle("dark",t==="dark");
  var m=document.querySelector('meta[name="theme-color"]');
  if(m)m.setAttribute("content",tc[t]);
  localStorage.removeItem(k.legacyAccentColor);
  d.style.removeProperty("--brand-accent");
  d.style.removeProperty("--brand-accent-text");
  d.style.removeProperty("--brand-accent-foreground");
  d.style.removeProperty("--ring");
  var f=localStorage.getItem(k.fontSize);
  if(f&&fs[f])d.style.setProperty("--font-base-size",fs[f]);
  var dc=${densityClasses};
  var dn=localStorage.getItem(k.density);
  var ld=localStorage.getItem(k.legacyDensity);
  if(ld!==null){if(dn===null&&ld==="compact"){dn="compact";localStorage.setItem(k.density,dn);}localStorage.removeItem(k.legacyDensity);}
  if(dn&&dc[dn])d.classList.add(dc[dn]);
  if(localStorage.getItem(k.reducedMotion)==="true")d.classList.add("reduce-motion");
  localStorage.setItem(k.colorMode,p);
}catch(e){}})();`
}
