"use client"

import { useState, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { enmascararFecha, isoATexto, textoAISO } from "@/lib/fechas"
import { cn } from "@/lib/utils"

interface DateTextInputProps extends Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  /** Fecha en YYYY-MM-DD, o vacío. */
  value: string
  /** Recibe YYYY-MM-DD cuando la fecha está completa y existe; vacío mientras no. */
  onValueChange: (iso: string) => void
}

/**
 * Fecha escrita con teclado numérico, sin calendario: DD/MM/AAAA con las diagonales
 * automáticas. Mismo comportamiento que la fecha de los hallazgos de Safe Walk.
 */
export function DateTextInput({ value, onValueChange, className, ...props }: DateTextInputProps) {
  const [texto, setTexto] = useState(() => isoATexto(value))
  const [valorPrevio, setValorPrevio] = useState(value)
  // Si la fecha cambia desde fuera (reinicio del formulario, lista que se reordena), el texto la sigue;
  // mientras se escribe, el valor vacío de una fecha incompleta no borra lo tecleado.
  if (value !== valorPrevio) {
    setValorPrevio(value)
    if (value !== (textoAISO(texto) ?? "")) setTexto(isoATexto(value))
  }
  return (
    <Input {...props} inputMode="numeric" autoComplete="off" maxLength={10} placeholder="DD/MM/AAAA"
      className={cn("tabular-nums", className)} value={texto}
      onChange={event => {
        const next = enmascararFecha(event.target.value)
        setTexto(next)
        onValueChange(textoAISO(next) ?? "")
      }} />
  )
}
