"use client"

import { useEffect } from "react"
import { Toaster, toast } from "sonner"
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from "lucide-react"
import { useTheme } from "@/components/theme-context"
import { useMobileNoticePlacement } from "@/lib/hooks/useMobileNoticePlacement"

const noticeOffset = {
  top: "calc(env(safe-area-inset-top, 0px) + var(--notice-edge))",
  right: "var(--notice-edge)",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + var(--notice-edge))",
  left: "var(--notice-edge)",
}

export function SonnerProvider() {
  const isMobile = useMobileNoticePlacement()
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
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleX aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle aria-hidden="true" className="animate-spin" />,
        close: <X aria-hidden="true" />,
      }}
      expand={false}
      visibleToasts={1}
      position={isMobile ? "top-center" : "bottom-right"}
      offset={noticeOffset}
      mobileOffset={noticeOffset}
      gap={12}
      toastOptions={{
        duration: 4000,
        closeButtonAriaLabel: "Cerrar notificación",
        classNames: {
          toast: "app-toast",
          success: "app-toast--success",
          error: "app-toast--error",
          warning: "app-toast--warning",
          info: "app-toast--info",
        },
      }}
    />
  )
}
