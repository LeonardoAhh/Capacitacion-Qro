import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase/client'
import { notify } from '@/lib/notify'

export interface ThemePreferences {
  accentColor?: string
  customColor?: string
  fontSize?: string
  density?: string
  reducedMotion?: boolean
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  avatar: string
  /** Puesto que se muestra en el menú de cuenta; lo captura el dev en Supabase. */
  puesto: string
  language: string
  dateFormat: string
  skills: string[]
  themePreferences: ThemePreferences
  /** Ya vio (practicó o cerró) el aviso de práctica de evaluación. */
  practiceSeen: boolean
  /** Inicio de sesión anterior al actual (ISO); null en el primer acceso. */
  previousAccess: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ─── Caché compartida ────────────────────────────────────────────────────────
// Cada página monta su propio Dashboard (barra lateral, menú de cuenta…). Sin
// caché, cada navegación volvía a consultar el perfil y el avatar. Ahora se
// consulta una vez por usuario y todas las instancias leen el mismo dato.

interface ProfileEntry {
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

const SIN_USUARIO: ProfileEntry = { profile: null, loading: false, error: null }
const CARGANDO: ProfileEntry = { profile: null, loading: true, error: null }

const entries = new Map<string, ProfileEntry>()
const enCurso = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function setEntry(userId: string, patch: Partial<ProfileEntry>) {
  entries.set(userId, { ...(entries.get(userId) ?? CARGANDO), ...patch })
  listeners.forEach(listener => listener())
}

type ProfileRow = Record<string, any>

function toProfile(row: ProfileRow, skills: string[] = []): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    email: row.email,
    avatar: row.avatar_url || '',
    puesto: row.puesto?.trim() || '',
    language: row.language || 'en',
    dateFormat: row.date_format || 'mm-dd-yyyy',
    skills,
    themePreferences: row.theme_preferences ?? {},
    practiceSeen: row.desempeno_practica_vista === true,
    previousAccess: row.acceso_anterior ?? null,
  }
}

function selectProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
}

async function createDefaultProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        first_name: 'User',
        last_name: '',
        display_name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar_url: '',
        timezone: 'america-new_york',
      })
      .select()
      .single()

    if (error) {
      // 23505 = unique_violation: the profile already exists.
      // This is a benign race condition (StrictMode double-invoke, concurrent
      // renders, etc.). Silently fetch and return the existing row.
      if ((error as any).code === '23505') {
        const { data: existing } = await selectProfile(userId)
        return existing ? toProfile(existing) : null
      }
      throw error
    }

    return toProfile(data)
  } catch (err) {
    console.error('Error creating default profile:', err instanceof Error ? err.message : JSON.stringify(err))
    return null
  }
}

async function queryProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await selectProfile(userId)
  if (error) throw error
  if (!data) return createDefaultProfile(userId)

  const { data: skillsData } = await supabase
    .from('skills')
    .select('skill_name')
    .eq('user_id', userId)

  return toProfile(data, skillsData?.map((s) => s.skill_name) || [])
}

/** Carga el perfil una sola vez a la vez por usuario; las llamadas simultáneas comparten la misma consulta. */
function loadProfile(userId: string): Promise<void> {
  const pending = enCurso.get(userId)
  if (pending) return pending

  setEntry(userId, { loading: true, error: null })
  const request = queryProfile(userId)
    .then(profile => setEntry(userId, { profile, loading: false }))
    .catch(err => {
      console.error('Error fetching profile:', err instanceof Error ? err.message : JSON.stringify(err))
      setEntry(userId, { loading: false, error: 'Failed to fetch profile' })
    })
    .finally(() => { enCurso.delete(userId) })
  enCurso.set(userId, request)
  return request
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProfile(userId?: string) {
  const { profile, loading, error } = useSyncExternalStore(
    subscribe,
    () => (userId ? entries.get(userId) ?? CARGANDO : SIN_USUARIO),
    () => (userId ? CARGANDO : SIN_USUARIO),
  )

  useEffect(() => {
    if (userId && !entries.has(userId)) void loadProfile(userId)
  }, [userId])

  /** Vuelve a consultar el perfil (p. ej. tras un cambio hecho en otro lado). */
  const fetchProfile = useCallback(async () => {
    if (userId) await loadProfile(userId)
  }, [userId])

  /** `silent`: sin aviso de "Perfil actualizado" (cambios que el usuario no hizo en Configuración). */
  const updateProfile = async (updates: Partial<UserProfile>, { silent = false }: { silent?: boolean } = {}) => {
    if (!userId || !profile) return { success: false, error: 'No user ID or profile available' }

    try {
      setEntry(userId, { error: null })

      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar
      if (updates.language !== undefined) dbUpdates.language = updates.language
      if (updates.dateFormat !== undefined) dbUpdates.date_format = updates.dateFormat
      if (updates.practiceSeen !== undefined) dbUpdates.desempeno_practica_vista = updates.practiceSeen

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('user_id', userId)

      if (error) throw error

      // Todas las instancias (menú de cuenta, configuración…) ven el cambio al momento.
      const current = entries.get(userId)?.profile ?? profile
      setEntry(userId, { profile: { ...current, ...updates } })
      if (!silent) notify.success('Perfil actualizado')
      return { success: true, message: 'Profile updated successfully' }
    } catch (err) {
      const errorMessage = 'Failed to update profile'
      setEntry(userId, { error: errorMessage })
      console.error('Error updating profile:', err instanceof Error ? err.message : JSON.stringify(err))
      if (!silent) notify.error('No se pudo actualizar el perfil')
      return { success: false, error: errorMessage }
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!userId) return { success: false, error: 'No user ID available' }

    try {
      setEntry(userId, { error: null })

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const result = await updateProfile({ avatar: publicUrl })

      if (!result.success) {
        await supabase.storage.from('avatars').remove([fileName])
        return result
      }

      return { success: true, message: 'Avatar uploaded successfully' }
    } catch (err) {
      const errorMessage = 'Failed to upload avatar'
      setEntry(userId, { error: errorMessage })
      console.error('Error uploading avatar:', err instanceof Error ? err.message : JSON.stringify(err))
      notify.error('No se pudo subir la foto')
      return { success: false, error: errorMessage }
    }
  }

  const updateThemePreferences = async (prefs: ThemePreferences) => {
    if (!userId) return { success: false, error: 'No user ID available' }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_preferences: prefs, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) throw error

      const current = entries.get(userId)?.profile
      if (current) setEntry(userId, { profile: { ...current, themePreferences: prefs } })
      return { success: true }
    } catch (err) {
      console.error('Error updating theme preferences:', err instanceof Error ? err.message : JSON.stringify(err))
      return { success: false, error: 'Failed to update theme preferences' }
    }
  }

  return { profile, loading, error, fetchProfile, updateProfile, uploadAvatar, updateThemePreferences }
}
