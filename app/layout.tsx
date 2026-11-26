import type React from "react"
import type { Metadata, Viewport } from "next"
import "@/app/globals.css"
import fontSans from "@/lib/fonts"
import { ThemeProvider } from "@/components/theme-context"
import { PWARegister } from "@/components/pwa-register"
import { SonnerProvider } from "@/components/ui/sonner-provider"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import { ConnectionStatus } from "@/components/connection-status"
import { UpdateBanner } from "@/components/update-banner"
import { MaintenanceGuard } from "@/components/maintenance-guard"
import { ViewportFix } from "@/components/viewport-fix"
import { UserProvider } from "@/lib/hooks/useUser"
import { RoleProvider } from "@/lib/hooks/useRole"
import { SignOutProvider } from "@/components/signout-overlay"
import { WorkspaceSwitchProvider } from "@/components/workspace-switch-overlay"
import {
  buildThemeBootstrapScript,
  APP_THEME_COLORS,
} from "@/lib/theme/constants"
import { SIDEBAR_BOOTSTRAP_SCRIPT } from "@/lib/navigation"

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: APP_THEME_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  // Zoom stays enabled (WCAG 1.4.4): users with low vision must be able
  // to scale the page. Auto-zoom on inputs is already mitigated by the
  // --font-base-size tokens being >= 16px by default.
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "Capacitación Qro",
  description:
    "Sistema de Administración, Estandarización y Control de Datos",
  applicationName: "Vertx System",
  appleWebApp: {
    capable: true,
    // "default" keeps the page below an opaque status bar. With
    // "black-translucent", iOS 26 draws its scroll-edge blur over the top
    // ~40pt of the installed app, header included, and no page style can
    // turn it off. env(safe-area-inset-top) is then 0, so the header's
    // status-bar padding collapses on its own.
    statusBarStyle: "default",
    title: "Vertx System",
    startupImage: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

// Apply theme settings synchronously before React hydrates to avoid FOUC.
// Generated from lib/theme/constants.ts (single source shared with ThemeProvider).
const THEME_BOOTSTRAP_SCRIPT = buildThemeBootstrapScript()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontSans.variable} font-sans`}
      >
        {/* Client-side viewport metrics (--initial/visual-viewport-height) */}
        <ViewportFix />
        <ThemeProvider>
          <SignOutProvider>
            <WorkspaceSwitchProvider>
            <UserProvider>
              <RoleProvider>
                <MaintenanceGuard>{children}</MaintenanceGuard>
                {/* App-wide overlays share the display preferences provider. */}
                <PWARegister />
                <UpdateBanner />
                <SonnerProvider />
                <ConfirmProvider />
                <ConnectionStatus />
              </RoleProvider>
            </UserProvider>
            </WorkspaceSwitchProvider>
          </SignOutProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
