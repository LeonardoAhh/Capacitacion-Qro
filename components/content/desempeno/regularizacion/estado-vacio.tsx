type Estado = "inicio" | "sin-coincidencias" | "sin-pendientes"

const mensajes: Record<Estado, { titulo: string; descripcion: string }> = {
  inicio: {
    titulo: "Busca una evaluación vencida",
    descripcion: "Ingresa un número, nombre o periodo para encontrar la evaluación que necesitas capturar.",
  },
  "sin-coincidencias": {
    titulo: "Sin coincidencias",
    descripcion: "Prueba con otro número, nombre o periodo.",
  },
  "sin-pendientes": {
    titulo: "No hay evaluaciones vencidas",
    descripcion: "No hay capturas tardías pendientes por ahora.",
  },
}

export function EstadoVacioRegularizacion({ estado }: { estado: Estado }) {
  const { titulo, descripcion } = mensajes[estado]

  return <div role="status" className="space-y-1 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
    <p className="text-label-sm text-foreground">{titulo}</p>
    <p className="text-body-sm text-muted-foreground">{descripcion}</p>
  </div>
}
