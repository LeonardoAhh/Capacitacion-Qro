type UnsavedChangesGuard = () => Promise<boolean>

const guards = new Set<UnsavedChangesGuard>()

export function registerUnsavedChangesGuard(guard: UnsavedChangesGuard) {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

/** Hay una captura sin guardar registrada (las páginas solo registran su guardia mientras hay cambios). */
export function hasUnsavedChanges() {
  return guards.size > 0
}

export async function confirmUnsavedChanges() {
  for (const guard of guards) {
    if (!(await guard())) return false
  }
  return true
}
