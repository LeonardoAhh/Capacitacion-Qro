import type jsPDF from "jspdf"

export const PRINT_FONT_FAMILY = "Inter"
const FONT_FILES = [
  { file: "Inter-Regular.ttf", style: "normal" },
  { file: "Inter-Bold.ttf", style: "bold" },
] as const

async function loadFont(file: string): Promise<string> {
  const response = await fetch(`/fonts/${file}`)
  if (!response.ok) throw new Error(`No se pudo cargar la fuente ${file}`)

  const buffer = await response.arrayBuffer()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1])
    reader.onerror = () => reject(new Error(`No se pudo leer la fuente ${file}`))
    reader.readAsDataURL(new Blob([buffer]))
  })
}

export async function registerPrintFont(doc: jsPDF): Promise<void> {
  const fonts = await Promise.all(FONT_FILES.map(async ({ file, style }) => ({
    file,
    style,
    data: await loadFont(file),
  })))

  for (const { file, style, data } of fonts) {
    doc.addFileToVFS(file, data)
    doc.addFont(file, PRINT_FONT_FAMILY, style)
  }
  doc.setFont(PRINT_FONT_FAMILY, "normal")
}
