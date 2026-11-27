"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { limpiarNombre, limpiarNumeroEmpleado, NUMERO_EMPLEADO_MAX } from "@/lib/validations/empleado"
import { cn } from "@/lib/utils"

type EmployeeInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
}

/** Número de empleado: solo dígitos, máximo 5. */
export function EmployeeNumberInput({ onValueChange, className, ...props }: EmployeeInputProps) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      maxLength={NUMERO_EMPLEADO_MAX}
      {...props}
      className={cn("tabular-nums", className)}
      onChange={event => onValueChange(limpiarNumeroEmpleado(event.target.value))}
    />
  )
}

/** Nombre de persona: solo letras, espacios, apóstrofo y guion. */
export function PersonNameInput({ onValueChange, ...props }: EmployeeInputProps) {
  return (
    <Input
      autoComplete="off"
      {...props}
      onChange={event => onValueChange(limpiarNombre(event.target.value))}
    />
  )
}
