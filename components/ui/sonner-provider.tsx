"use client"

import { useEffect, type CSSProperties } from "react"
import { Toaster, toast } from "sonner"
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from "lucide"
import { X } from "lucide-react"
import { useTheme } from "@/components/theme-context"
import { NoticeIcon } from "@/components/ui/notice-icon"

// Arriba al centro en todos los tamaños; en celular ocupa el ancho (globals.css: .app-toast).
const noticeOffset = {
  top: "calc(env(safe-area-inset-top, 0px) + var(--notice-edge))",
  right: "var(--notice-edge)",
  left: "var(--notice-edge)",
}

export function SonnerProvider() {
  const { themeMode } = useTheme()
  // Dev-only handle: lets you trigger toasts from the browser console
  // (window.__toast.success(...)) to verify styles per variant.
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      ;(window as unknown as { __toast: typeof toast }).__toast = toast
    }
  }, [])

  return (
    <Toaster
      theme={themeMode}
      closeButton
      icons={{
        success: <NoticeIcon icon={CircleCheck} tone="success" />,
        error: <NoticeIcon icon={CircleX} tone="error" />,
        warning: <NoticeIcon icon={TriangleAlert} tone="warning" />,
        info: <NoticeIcon icon={Info} tone="info" />,
        loading: <NoticeIcon icon={LoaderCircle} spin />,
        close: <X aria-hidden="true" />,
      }}
      expand={false}
      visibleToasts={1}
      position="top-center"
      offset={noticeOffset}
      mobileOffset={noticeOffset}
      gap={12}
      // Ancho del área de toasts en escritorio; cada toast se ajusta a su contenido.
      style={{ "--width": "var(--notice-width)" } as CSSProperties}
      toastOptions={{
        duration: 4000,
        closeButtonAriaLabel: "Cerrar notificación",
        classNames: { toast: "app-toast" },
      }}
    />
  )
}
