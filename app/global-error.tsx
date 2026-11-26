"use client"

import fontSans from "@/lib/fonts"

/**
 * Last-resort error boundary. Rendered only when the root layout itself
 * crashes (e.g. ThemeProvider throws), so it ships its own <html> + <body>
 * and cannot rely on tokens or providers. Keep styles inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body
        className={fontSans.variable}
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-sans)",
          background: "#f1f1f1",
          color: "#1c1c1c",
          colorScheme: "light",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            background: "#fafafa",
            border: "1px solid #cccccc",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: "18px",
              letterSpacing: 0,
              textTransform: "uppercase",
              color: "#595959",
              margin: 0,
            }}
          >
            {error.digest ? `Error #${error.digest}` : "Error crítico"}
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: "32px",
              letterSpacing: "-0.24px",
              margin: "8px 0",
            }}
          >
            No pudimos cargar la aplicación
          </h1>
          <p style={{ fontSize: 15, lineHeight: "22px", color: "#595959", margin: 0 }}>
            Intenta recargar la página. Si el problema continúa, cierra sesión y vuelve a entrar.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 6,
              border: "none",
              background: "#006ae6",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              lineHeight: "22px",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
