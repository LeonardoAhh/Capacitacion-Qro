import { z } from 'zod'

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Escribe tu nombre').max(50, 'Usa máximo 50 caracteres'),
  lastName: z.string().min(1, 'Escribe tus apellidos').max(50, 'Usa máximo 50 caracteres'),
  displayName: z.string().min(1, 'Escribe cómo quieres que te vean').max(100, 'Usa máximo 100 caracteres'),
  email: z.string().email('Correo no válido'),
  language: z.string().min(1, 'Language is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
})

export const skillSchema = z.object({
  skill: z.string()
    .min(1, 'Skill name is required')
    .max(50, 'Skill name too long')
    .regex(/^[a-zA-Z0-9\s\-\+\#\.\(\)]+$/, 'Skill name contains invalid characters'),
})

export type ProfileFormData = z.infer<typeof profileSchema>
export type SkillFormData = z.infer<typeof skillSchema>
