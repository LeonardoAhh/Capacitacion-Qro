"use client"

import { useEffect, useState } from "react"
import { Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hoyISO } from "@/lib/fechas"
import { enHojas, guardarBorrador, leerBorrador, type FilaTE, type ValoresCaptura } from "@/lib/formato-te"
import { notify } from "@/lib/notify"
import { CapturaTE } from "./captura-te"
import { ListaTE } from "./lista-te"
import { useEmpleadosPorNumero } from "./use-empleados-por-numero"
import { VistaPreviaTE } from "./vista-previa-te"

const VALORES_INICIALES: ValoresCaptura = {
  fecha: "",
  ordinaria: { inicio: "", fin: "" },
  extraordinaria: { inicio: "", fin: "" },
}
const SECCION = "text-eyebrow uppercase text-muted-foreground"

/**
 * Formato TE: captura de quién trabajará tiempo extra, en hojas de 10 empleados, con la vista
 * previa del formato impreso. La captura se guarda en este navegador mientras se arma.
 */
export function FormatoTEPage() {
  const empleados = useEmpleadosPorNumero()
  // La página solo se dibuja en el navegador (tras cargar la sesión): el borrador se lee al iniciar.
  const [borrador] = useState(leerBorrador)
  const [valores, setValores] = useState<ValoresCaptura>(() => borrador?.valores ?? { ...VALORES_INICIALES, fecha: hoyISO() })
  const [filas, setFilas] = useState<FilaTE[]>(() => borrador?.filas ?? [])
  const [motivos, setMotivos] = useState(() => borrador?.motivos ?? "")

  useEffect(() => { guardarBorrador({ valores, filas, motivos }) }, [valores, filas, motivos])

  const hojas = enHojas(filas).length

  const vaciar = async () => {
    const ok = await notify.confirm({
      title: "Vaciar la lista",
      description: `Se quitarán ${filas.length} ${filas.length === 1 ? "empleado" : "empleados"} de ${hojas === 1 ? "la hoja" : `las ${hojas} hojas`}.`,
      confirmLabel: "Vaciar",
      tone: "destructive",
    })
    if (ok) setFilas([])
  }

  return (
    // Desde laptop la página toma el alto disponible: la captura queda fija arriba y la lista y la
    // vista previa hacen scroll por dentro (el main no hace scroll).
    <div className="space-y-6 dense:space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <CapturaTE
        empleados={empleados}
        valores={valores}
        onValoresChange={setValores}
        filas={filas}
        onAgregar={fila => setFilas(actuales => [...actuales, fila])}
        motivos={motivos}
        onMotivosChange={setMotivos}
      />

      {/* Lista para corregir a la izquierda; desde pantallas anchas, la vista previa a su lado y cada
          una con su propio scroll. Antes de eso van una bajo la otra en un solo scroll. */}
      <div className="grid items-start gap-6 dense:gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] 2xl:grid-rows-[minmax(0,1fr)] 2xl:items-stretch 2xl:overflow-visible">
        <section aria-labelledby="te-lista" className="min-w-0 space-y-3 2xl:flex 2xl:min-h-0 2xl:flex-col">
          <div className="flex min-h-(--control-height-sm) items-center justify-between gap-2">
            <h2 id="te-lista" className={SECCION}>Empleados</h2>
            {filas.length > 0 && (
              <Button type="button" variant="outline" size="sm" className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={() => void vaciar()}>
                <Trash2 aria-hidden="true" />
                Vaciar lista
              </Button>
            )}
          </div>
          <div className="2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto">
            <ListaTE filas={filas} onQuitar={id => setFilas(actuales => actuales.filter(fila => fila.id !== id))} />
          </div>
        </section>

        <section aria-labelledby="te-vista-previa" className="min-w-0 space-y-3 2xl:flex 2xl:min-h-0 2xl:flex-col">
          <div className="flex min-h-(--control-height-sm) items-center justify-between gap-2">
            <h2 id="te-vista-previa" className={SECCION}>Vista previa</h2>
            <Button type="button" size="sm" onClick={() => window.print()} disabled={filas.length === 0}>
              <Printer aria-hidden="true" />
              {hojas > 1 ? `Imprimir ${hojas} hojas` : "Imprimir"}
            </Button>
          </div>
          <VistaPreviaTE filas={filas} motivos={motivos} />
        </section>
      </div>
    </div>
  )
}
