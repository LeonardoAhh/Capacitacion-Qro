"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/lib/hooks/useProfile"
import { useUser } from "@/lib/hooks/useUser"
import { notify } from "@/lib/notify"
import { profileSchema, type ProfileFormData } from "@/lib/validations/profile"

const FIELDS: { name: "firstName" | "lastName" | "displayName"; label: string; hint?: string }[] = [
  { name: "firstName", label: "Nombre" },
  { name: "lastName", label: "Apellidos" },
  { name: "displayName", label: "Nombre visible", hint: "Así te ven los demás en la app." },
]

/** Perfil: foto y datos personales. El correo solo se muestra. */
export function ProfileSettings() {
  const { user } = useUser()
  const { profile, loading, updateProfile, uploadAvatar } = useProfile(user?.id)
  const [uploading, setUploading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", displayName: "", email: "", language: "en", dateFormat: "mm-dd-yyyy" },
  })

  useEffect(() => {
    if (!profile) return
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      email: profile.email,
      language: profile.language || "en",
      dateFormat: profile.dateFormat || "mm-dd-yyyy",
    })
  }, [profile, reset])

  const onSubmit = async (data: ProfileFormData) => {
    setSaveError(null)
    const result = await updateProfile(data)
    if (result.success) notify.success("Perfil guardado")
    else setSaveError(result.error || "No se pudo guardar. Inténtalo de nuevo.")
  }

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setSaveError(null)
    const result = await uploadAvatar(file)
    if (result.success) notify.success("Foto actualizada")
    else setSaveError(result.error || "No se pudo cambiar la foto. Inténtalo de nuevo.")
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (loading || !profile) {
    return <div className="space-y-3" aria-label="Cargando perfil">
      <Skeleton className="size-14 rounded-full" />
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
    </div>
  }

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase() || "?"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-center gap-3">
        <Avatar className="size-14 shrink-0">
          {profile.avatar && <AvatarImage src={profile.avatar} alt="" />}
          <AvatarFallback className="bg-muted text-label-sm text-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploading}>
            Cambiar foto
          </Button>
          <p className="mt-1 text-body-sm text-muted-foreground">Imagen cuadrada de hasta 2 MB.</p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={changePhoto}
            className="hidden" aria-label="Elegir foto de perfil" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ name, label, hint }) => {
          const error = errors[name]?.message
          const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined
          return (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name} className="text-label-sm text-foreground">{label}</Label>
              <Input id={name} {...register(name)} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
              {error
                ? <p id={`${name}-error`} className="text-body-sm text-destructive">{error}</p>
                : hint && <p id={`${name}-hint`} className="text-body-sm text-muted-foreground">{hint}</p>}
            </div>
          )
        })}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-label-sm text-foreground">Correo</Label>
          <Input id="email" type="email" value={user?.email || ""} readOnly className="bg-muted/40 text-muted-foreground" />
        </div>
      </div>

      {saveError && <p role="alert" className="text-body-sm text-destructive">{saveError}</p>}

      <div className="flex justify-end gap-2">
        {isDirty && <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={isSubmitting}>Descartar</Button>}
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}
