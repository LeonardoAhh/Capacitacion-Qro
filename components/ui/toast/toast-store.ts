/**
 * Estado de los toasts fuera de React: `notify` los agrega desde cualquier parte y el
 * `Toaster` los dibuja con useSyncExternalStore.
 */

export type ToastKind = "success" | "error" | "warning" | "info" | "loading"
/**
 * Cómo se dibuja: `type` escribe el título por celdas tramadas; `materialize` hace aparecer la
 * tarjeta por tramado y luego su texto; `timer` escribe el título y agrega una barra con el tiempo.
 */
export type ToastEffect = "type" | "materialize" | "timer"
export type ToastId = string | number

export interface ToastAction {
  label: string
  onClick: () => void
  /** Si es false, pulsar la acción deja el toast abierto para actualizarlo en su lugar. */
  closeOnClick?: boolean
}

export interface ToastInput {
  kind: ToastKind
  title: string
  description?: string
  /** Milisegundos en pantalla; `Infinity` lo deja hasta que se cierre. */
  duration: number
  action?: ToastAction
  /** Sin indicar, el del Toaster. */
  effect?: ToastEffect
}

export interface ToastData extends ToastInput {
  id: ToastId
  /** Cambia en cada actualización: reinicia el tiempo y vuelve a escribir el título. */
  version: number
  leaving: boolean
}

/** Toasts a la vez; al llegar otro, el más antiguo se va. */
const LIMIT = 3

let toasts: readonly ToastData[] = []
let nextId = 1
const listeners = new Set<() => void>()
const EMPTY: readonly ToastData[] = []

function set(next: readonly ToastData[]) {
  toasts = next
  listeners.forEach(listener => listener())
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getToasts = () => toasts
export const getServerToasts = () => EMPTY

/** Con un `id` que ya está en pantalla, lo actualiza en su lugar. */
export function addToast(input: ToastInput & { id?: ToastId }): ToastId {
  const { id = nextId++, ...data } = input
  if (toasts.some(toast => toast.id === id && !toast.leaving)) {
    updateToast(id, data)
    return id
  }
  const visibles = toasts.filter(toast => !toast.leaving && toast.id !== id)
  const sobran = new Set(visibles.slice(0, Math.max(0, visibles.length - LIMIT + 1)).map(toast => toast.id))
  set([
    ...toasts.filter(toast => toast.id !== id).map(toast => sobran.has(toast.id) ? { ...toast, leaving: true } : toast),
    { ...data, id, version: 0, leaving: false },
  ])
  return id
}

export function updateToast(id: ToastId, patch: Partial<ToastInput>) {
  set(toasts.map(toast => toast.id === id ? { ...toast, ...patch, version: toast.version + 1, leaving: false } : toast))
}

/** Inicia la salida; sin `id`, la de todos. */
export function closeToast(id?: ToastId) {
  set(toasts.map(toast => id === undefined || toast.id === id ? { ...toast, leaving: true } : toast))
}

/** Lo quita al terminar su salida (lo llama el Toaster). */
export function removeToast(id: ToastId) {
  set(toasts.filter(toast => toast.id !== id || !toast.leaving))
}
