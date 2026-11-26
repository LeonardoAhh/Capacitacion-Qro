"use client"

import type React from "react"
import { createContext, startTransition, useCallback, useContext, useEffect, useState } from "react"
import {
  DENSITY_CLASSES,
  FONT_SIZE_MAP,
  APP_THEME_COLORS,
  isDensity,
  isThemeMode,
  THEME_STORAGE_KEYS,
  type Density,
  type FontSize,
  type ThemeMode,
} from "@/lib/theme/constants"

export type { Density, FontSize, ThemeMode }

type ThemeContextType = {
  themeMode: ThemeMode
  fontSize: FontSize
  density: Density
  reducedMotion: boolean
  setThemeMode: (mode: ThemeMode) => void
  setFontSize: (size: FontSize) => void
  setDensity: (density: Density) => void
  setReducedMotion: (reduced: boolean) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system")
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)
  const [fontSize, setFontSizeState] = useState<FontSize>("medium")
  const [density, setDensityState] = useState<Density>("auto")
  const [reducedMotion, setReducedMotionState] = useState(false)

  const setThemeMode = useCallback((mode: ThemeMode) => setThemeModeState(mode), [])
  const setFontSize = useCallback((size: FontSize) => setFontSizeState(size), [])
  const setDensity = useCallback((value: Density) => setDensityState(value), [])
  const setReducedMotion = useCallback((value: boolean) => setReducedMotionState(value), [])

  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
    const syncSystemTheme = () => setSystemPrefersDark(colorScheme.matches)
    const storedThemeMode = localStorage.getItem(THEME_STORAGE_KEYS.colorMode)
    localStorage.removeItem(THEME_STORAGE_KEYS.legacyAccentColor)
    document.documentElement.style.removeProperty("--brand-accent")
    document.documentElement.style.removeProperty("--brand-accent-text")
    document.documentElement.style.removeProperty("--brand-accent-foreground")
    document.documentElement.style.removeProperty("--ring")

    const storedFontSize = localStorage.getItem(THEME_STORAGE_KEYS.fontSize)
    const storedDensity = localStorage.getItem(THEME_STORAGE_KEYS.density)
    const storedReducedMotion = localStorage.getItem(THEME_STORAGE_KEYS.reducedMotion)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    syncSystemTheme()
    colorScheme.addEventListener("change", syncSystemTheme)

    startTransition(() => {
      setThemeMode(isThemeMode(storedThemeMode) ? storedThemeMode : "system")
      if (storedFontSize === "small" || storedFontSize === "medium" || storedFontSize === "large") {
        setFontSize(storedFontSize)
      }
      if (isDensity(storedDensity)) setDensity(storedDensity)
      setReducedMotion(
        storedReducedMotion !== null ? storedReducedMotion === "true" : prefersReducedMotion,
      )
      setInitialized(true)
    })

    return () => colorScheme.removeEventListener("change", syncSystemTheme)
  }, [setDensity, setFontSize, setReducedMotion, setThemeMode])

  useEffect(() => {
    if (!initialized) return
    const resolvedThemeMode = themeMode === "system"
      ? systemPrefersDark ? "dark" : "light"
      : themeMode
    document.documentElement.classList.toggle("dark", resolvedThemeMode === "dark")
    localStorage.setItem(THEME_STORAGE_KEYS.colorMode, themeMode)
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute("content", APP_THEME_COLORS[resolvedThemeMode])
  }, [initialized, systemPrefersDark, themeMode])

  useEffect(() => {
    if (!initialized) return
    document.documentElement.style.setProperty("--font-base-size", FONT_SIZE_MAP[fontSize])
    localStorage.setItem(THEME_STORAGE_KEYS.fontSize, fontSize)
  }, [fontSize, initialized])

  useEffect(() => {
    if (!initialized) return
    for (const [value, className] of Object.entries(DENSITY_CLASSES)) {
      if (className) document.documentElement.classList.toggle(className, value === density)
    }
    localStorage.setItem(THEME_STORAGE_KEYS.density, density)
  }, [density, initialized])

  useEffect(() => {
    if (!initialized) return
    document.documentElement.classList.toggle("reduce-motion", reducedMotion)
    localStorage.setItem(THEME_STORAGE_KEYS.reducedMotion, String(reducedMotion))
  }, [initialized, reducedMotion])

  const resetTheme = useCallback(() => {
    setThemeMode("system")
    setFontSize("medium")
    setDensity("auto")
    setReducedMotion(false)
    Object.values(THEME_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  }, [setDensity, setFontSize, setReducedMotion, setThemeMode])

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        fontSize,
        density,
        reducedMotion,
        setThemeMode,
        setFontSize,
        setDensity,
        setReducedMotion,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
