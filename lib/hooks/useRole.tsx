"use client"

import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useUser } from './useUser'
import { canAccessRoute, ROLE_POLICIES, toAppRole, type AppRole, type RolePolicy } from '@/lib/constants/roles'
import type { WorkspaceId } from '@/lib/navigation'

export type { AppRole } from '@/lib/constants/roles'

export type RoleContextType = {
  role: AppRole
  departamentos: string[] | null
  canEdit: boolean
  isReadOnly: boolean
  isEvaluador: boolean
  canEvaluate: boolean
  canCapturePlantilla: boolean
  canManageSafety: boolean
  supervisesEvaluations: boolean
  employeesOnly: boolean
  workspaces: readonly WorkspaceId[]
  /** ¿El rol puede abrir esta ruta? (lib/constants/roles) */
  canAccess: (path: string) => boolean
  loading: boolean
}

// Sin sesión o mientras carga: permisos de solo lectura, como antes.
const DEFAULT_ROLE: AppRole = 'admin'

function permissions(role: AppRole, signedIn: boolean) {
  const policy: RolePolicy = ROLE_POLICIES[role]
  return {
    canEdit: signedIn && policy.canEdit,
    isReadOnly: !signedIn || policy.readOnly,
    isEvaluador: signedIn && role === 'evaluador',
    canEvaluate: signedIn && policy.canEvaluate,
    canCapturePlantilla: signedIn && policy.canCapturePlantilla,
    canManageSafety: signedIn && policy.canManageSafety,
    supervisesEvaluations: signedIn && policy.supervisesEvaluations,
    employeesOnly: policy.employeesOnly,
    workspaces: policy.workspaces,
  }
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser()
  const [role, setRole] = useState<AppRole>(DEFAULT_ROLE)
  const [departamentos, setDepartamentos] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setRole(DEFAULT_ROLE)
      setDepartamentos(null)
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, departamentos')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (isMounted && !error && data?.role) {
          setRole(toAppRole(data.role))
          setDepartamentos((data.departamentos as string[] | null) ?? null)
        }
      } catch {
        // Se queda con el rol por defecto (solo lectura).
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchRole()

    return () => { isMounted = false }
  }, [user, userLoading])

  const canAccess = useCallback((path: string) => canAccessRoute(role, path), [role])

  return (
    <RoleContext.Provider value={{ role, departamentos, ...permissions(role, !!user), canAccess, loading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext)
  if (context === undefined) {
    // Valor seguro si se usa antes de montar el provider.
    return {
      role: DEFAULT_ROLE,
      departamentos: null,
      ...permissions(DEFAULT_ROLE, false),
      canAccess: (path: string) => canAccessRoute(DEFAULT_ROLE, path),
      loading: true,
    }
  }
  return context
}
