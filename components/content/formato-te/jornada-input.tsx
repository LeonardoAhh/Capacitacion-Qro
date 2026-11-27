"use client"

import { useState, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { enmascararJornada, jornadaATexto, textoAJornada, type Jornada } from "@/lib/formato-te"
import { cn } from "@/lib/utils"

const VACIA: Jornada = { inicio: "", fin: "" }

interface JornadaInputProps extends Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: Jornada
  /** Recibe la jornada cuando está completa y es válida; vacía mientras no. */
  onValueChange: (jornada: Jornada) => void
}

/**
 * Jornada escrita con teclado numérico, como la fecha (DateTextInput): "06001400" queda
 * "06:00-14:00" con los dos puntos y el guion automáticos.
 */
export function JornadaInput({ value, onValueChange, className, ...props }: JornadaInputProps) {
  const [texto, setTexto] = useState(() => jornadaATexto(value))
  const [valorPrevio, setValorPrevio] = useState(value)
  // Cambio desde fuera (borrador, reinicio): el texto lo sigue; mientras se escribe, no se borra.
  if (value !== valorPrevio) {
    setValorPrevio(value)
    if (jornadaATexto(value) !== jornadaATexto(textoAJornada(texto) ?? VACIA)) setTexto(jornadaATexto(value))
  }
  return (
    <Input {...props} inputMode="numeric" autoComplete="off" maxLength={11} placeholder="00:00-00:00"
      className={cn("tabular-nums", className)} value={texto}
      onChange={event => {
        const next = enmascararJornada(event.target.value)
        setTexto(next)
        onValueChange(textoAJornada(next) ?? VACIA)
      }} />
  )
}
