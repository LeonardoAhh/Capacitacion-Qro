import { toast, type ExternalToast } from "sonner"
import { confirm as confirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog"

type ToastKind = "success" | "error" | "warning" | "info"

interface Action {
  label: string
  onClick: () => void
}

interface NotifyOptions extends Omit<ExternalToast, "action"> {
  action?: Action
}

// Higher severity stays visible longer so errors are readable before auto-dismiss.
const DURATION: Record<ToastKind, number> = {
  success: 2500,
  info:    3000,
  warning: 4000,
  error:   5000,
}

function emit(kind: ToastKind, message: string, opts?: NotifyOptions) {
  return toast[kind](message, {
    duration: DURATION[kind],
    ...opts,
  })
}

export const notify = {
  success: (msg: string, opts?: NotifyOptions) => emit("success", msg, opts),
  error:   (msg: string, opts?: NotifyOptions) => emit("error",   msg, opts),
  warning: (msg: string, opts?: NotifyOptions) => emit("warning", msg, opts),
  info:    (msg: string, opts?: NotifyOptions) => emit("info",    msg, opts),

  promise: <T,>(
    promise: Promise<T> | (() => Promise<T>),
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error:   string | ((err: unknown) => string)
    },
  ) => toast.promise(promise, msgs),

  dismiss: (id?: string | number) => toast.dismiss(id),

  confirm: (options: ConfirmOptions) => confirmDialog(options),
} as const

export type { NotifyOptions, ConfirmOptions }
