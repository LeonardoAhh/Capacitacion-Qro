import { Ubuntu } from "next/font/google"

// Ubuntu (Ubuntu Font Licence): pesos 400 (texto), 500 (etiquetas) y 700 (encabezados).
// next/font la descarga al compilar y la sirve desde la propia app: el navegador no consulta
// Google en tiempo de ejecución.
const fontSans = Ubuntu({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
})

export default fontSans
