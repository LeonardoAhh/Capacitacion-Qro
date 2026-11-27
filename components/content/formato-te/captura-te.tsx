"use client"

import { useId, useRef, useState } from "react"
import { DateTextInput } from "@/components/ui/date-text-input"
import { EmployeeNumberInput } from "@/components/ui/employee-inputs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { horasDe, textoHoras, type FilaTE, type ValoresCaptura } from "@/lib/formato-te"
import { notify } from "@/lib/notify"
import { JornadaInput } from "./jornada-input"
import type { EmpleadoTE } from "./use-empleados-por-numero"

/** Los números de la plantilla son de 4 dígitos: al completarlos se agrega sin pulsar nada. */
const DIGITOS_AUTO = 4
const CAMPO = "min-w-0 space-y-2"
const CONTROL = "md:h-(--control-height-sm)"

interface CapturaTEProps {
  empleados: ReadonlyMap<string, EmpleadoTE> | null
  valores: ValoresCaptura
  onValoresChange: (valores: ValoresCaptura) => void
  filas: readonly FilaTE[]
  onAgregar: (fila: FilaTE) => void
  /** Van al pie de cada hoja; se capturan en la misma línea que lo demás. */
  motivos: string
  onMotivosChange: (motivos: string) => void
}

/**
 * Captura en ráfaga: fecha y jornadas se fijan una vez; luego solo se teclean números. Cada
 * número completo se agrega a la lista con esos valores y el campo queda listo para el siguiente.
 */
export function CapturaTE({ empleados, valores, onValoresChange, filas, onAgregar, motivos, onMotivosChange }: CapturaTEProps) {
  const id = useId()
  const [numero, setNumero] = useState("")
  const numeroRef = useRef<HTMLInputElement>(null)
  const horasExtra = horasDe(valores.extraordinaria)

  /** `avisar`: con Enter, dice por qué no se agregó; al teclear, espera al siguiente dígito. */
  const intentar = (valor: string, avisar: boolean) => {
    if (!empleados || !valor) return
    const empleado = empleados.get(valor)
    if (!empleado) {
      if (avisar) notify.error("No está en Plantilla", { description: `Número ${valor}` })
      return
    }
    if (!valores.fecha) { notify.error("Falta la fecha"); return }
    if (!horasDe(valores.ordinaria)) { notify.error("Falta la jornada ordinaria"); return }
    if (!horasExtra) { notify.error("Falta la jornada extraordinaria"); return }
    setNumero("")
    if (filas.some(fila => fila.numero === valor && fila.fecha === valores.fecha)) {
      notify.warning("Ya está en la lista", { description: empleado.nombre })
      return
    }
    onAgregar({ id: crypto.randomUUID(), numero: valor, nombre: empleado.nombre, puesto: empleado.puesto, ...valores })
    numeroRef.current?.focus()
  }

  return (
    // Desde tablet, número, fecha y jornadas en una fila y horas y motivos en la segunda; en
    // pantallas anchas, todo en una línea con los motivos tomando el espacio que sobra.
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,10rem))_minmax(0,7rem)_minmax(0,1fr)]">
      <div className={CAMPO}>
        <Label htmlFor={`${id}-numero`}>Número de empleado</Label>
        <EmployeeNumberInput
          ref={numeroRef}
          id={`${id}-numero`}
          autoFocus
          disabled={!empleados}
          className={CONTROL}
          aria-busy={!empleados || undefined}
          value={numero}
          onValueChange={valor => {
            setNumero(valor)
            if (valor.length >= DIGITOS_AUTO) intentar(valor, false)
          }}
          onKeyDown={event => {
            if (event.key !== "Enter") return
            event.preventDefault()
            intentar(numero, true)
          }}
        />
      </div>
      <div className={CAMPO}>
        <Label htmlFor={`${id}-fecha`}>Fecha</Label>
        <DateTextInput id={`${id}-fecha`} className={CONTROL} value={valores.fecha} onValueChange={fecha => onValoresChange({ ...valores, fecha })} />
      </div>
      <div className={CAMPO}>
        <Label htmlFor={`${id}-ordinaria`}>Jornada ordinaria</Label>
        <JornadaInput id={`${id}-ordinaria`} className={CONTROL} value={valores.ordinaria}
          onValueChange={ordinaria => onValoresChange({ ...valores, ordinaria })} />
      </div>
      <div className={CAMPO}>
        <Label htmlFor={`${id}-extra`}>Jornada extraordinaria</Label>
        <JornadaInput id={`${id}-extra`} className={CONTROL} value={valores.extraordinaria}
          onValueChange={extraordinaria => onValoresChange({ ...valores, extraordinaria })} />
      </div>
      {/* Se calcula con la jornada extraordinaria. */}
      <div className={CAMPO}>
        <Label htmlFor={`${id}-horas`}>Horas extras</Label>
        <Input id={`${id}-horas`} readOnly tabIndex={-1} className={`${CONTROL} tabular-nums`} value={horasExtra ? textoHoras(horasExtra) : ""} />
      </div>
      <div className={`${CAMPO} col-span-2 sm:col-span-3 xl:col-span-1`}>
        <Label htmlFor={`${id}-motivos`}>Motivos</Label>
        <Input id={`${id}-motivos`} className={CONTROL} value={motivos} onChange={event => onMotivosChange(event.target.value)}
          placeholder="Por qué es necesario el tiempo extra" />
      </div>
    </div>
  )
}
