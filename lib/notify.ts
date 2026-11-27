import { addToast, closeToast, updateToast, type ToastAction, type ToastEffect, type ToastId } from "@/components/ui/toast/toast-store"
import { confirm as confirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog"

type ToastKind = "success" | "error" | "warning" | "info"

interface NotifyOptions {
  /** Con el id de un toast en pantalla, lo actualiza en lugar de agregar otro. */
  id?: ToastId
  description?: string
  /** Milisegundos; `Infinity` lo deja hasta que se cierre. */
  duration?: number
  action?: ToastAction
  /** Cambia el efecto solo para este toast. */
  effect?: ToastEffect
}

// Higher severity stays visible longer so errors are readable before auto-dismiss.
const DURATION: Record<ToastKind, number> = {
  success: 2500,
  info:    3000,
  warning: 4000,
  error:   5000,
}

function emit(kind: ToastKind, title: string, opts?: NotifyOptions) {
  return addToast({ kind, title, duration: DURATION[kind], ...opts })
}

export const notify = {
  success: (msg: string, opts?: NotifyOptions) => emit("success", msg, opts),
  error:   (msg: string, opts?: NotifyOptions) => emit("error",   msg, opts),
  warning: (msg: string, opts?: NotifyOptions) => emit("warning", msg, opts),
  info:    (msg: string, opts?: NotifyOptions) => emit("info",    msg, opts),

  /** Un solo toast que pasa de "cargando" al resultado; el título cambia en su lugar. */
  promise: <T,>(
    promise: Promise<T> | (() => Promise<T>),
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error:   string | ((err: unknown) => string)
    },
  ) => {
    const id = addToast({ kind: "loading", title: msgs.loading, duration: Infinity })
    const result = typeof promise === "function" ? promise() : promise
    result.then(
      data => updateToast(id, { kind: "success", title: typeof msgs.success === "function" ? msgs.success(data) : msgs.success, duration: DURATION.success }),
      (err: unknown) => updateToast(id, { kind: "error", title: typeof msgs.error === "function" ? msgs.error(err) : msgs.error, duration: DURATION.error }),
    )
    return id
  },

  dismiss: (id?: ToastId) => closeToast(id),

  confirm: (options: ConfirmOptions) => confirmDialog(options),
} as const

export type { NotifyOptions, ConfirmOptions }
