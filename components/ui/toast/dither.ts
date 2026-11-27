/** Matriz de Bayer 4×4: el umbral de cada celda del tramado ordenado. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(value => (value + 0.5) / 16)

/** Lado de cada celda en px. */
export const CELL = 2

/** La celda en (x, y) se pinta si la densidad de su zona supera su umbral. */
export const celdaVisible = (x: number, y: number, densidad: number) =>
  densidad > BAYER[((y / CELL) % 4) * 4 + ((x / CELL) % 4)]

/** Ajusta el lienzo a su caja y la escala de pantalla; devuelve el contexto listo y el tamaño en px CSS. */
export function prepararLienzo(canvas: HTMLCanvasElement, caja: Element) {
  const { width, height } = caja.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.ceil(width * ratio)
  canvas.height = Math.ceil(height * ratio)
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.scale(ratio, ratio)
    ctx.fillStyle = getComputedStyle(canvas).color
  }
  return { ctx, width, height }
}

const NIVELES = 16
const TESELA = CELL * 4
let teselas: string[] | null = null

/** Máscara de una tesela de 4×4 celdas con `nivel` celdas encendidas (0 nada, 16 completa). */
function tesela(nivel: number) {
  teselas ??= Array.from({ length: NIVELES + 1 }, (_, encendidas) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = TESELA
    const ctx = canvas.getContext("2d")
    for (let y = 0; y < TESELA; y += CELL) {
      for (let x = 0; x < TESELA; x += CELL) {
        if (ctx && celdaVisible(x, y, encendidas / NIVELES)) ctx.fillRect(x, y, CELL, CELL)
      }
    }
    return canvas.toDataURL()
  })
  return teselas[Math.max(0, Math.min(NIVELES, Math.round(nivel)))]
}

function enmascarar(el: HTMLElement, nivel: number | null) {
  const mascara = nivel === null ? "" : `url(${tesela(nivel)})`
  el.style.maskImage = mascara
  el.style.webkitMaskImage = mascara
  el.style.maskSize = el.style.webkitMaskSize = nivel === null ? "" : `${TESELA}px ${TESELA}px`
}

/**
 * Hace aparecer (`hacia` 1) o desaparecer (0) un elemento por tramado ordenado: sus píxeles
 * se encienden o apagan en el orden de la matriz de Bayer. Devuelve cómo cancelarlo.
 */
export function tramar(el: HTMLElement, hacia: 0 | 1, ms: number, alTerminar: () => void) {
  let frame = 0
  const inicio = performance.now()
  enmascarar(el, hacia ? 0 : NIVELES)
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / ms)
    const nivel = (hacia ? t : 1 - t) * NIVELES
    if (t < 1) {
      enmascarar(el, nivel)
      frame = requestAnimationFrame(paso)
      return
    }
    // Completa: sin máscara. Vacía: la deja en 0 para que no se asome antes de quitarse.
    enmascarar(el, hacia ? null : 0)
    alTerminar()
  }
  frame = requestAnimationFrame(paso)
  return () => cancelAnimationFrame(frame)
}
