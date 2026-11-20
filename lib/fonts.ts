import localFont from "next/font/local"

// Alpino (Fontshare): Regular, Medium y Bold. El peso 600 usa el archivo Bold.
// Licencia: public/fonts/Alpino-FFL.txt (autohospedaje permitido; no modificar archivos).
const fontSans = localFont({
  src: [
    { path: "../public/fonts/alpino-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/alpino-medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/alpino-bold.woff2", weight: "600 700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
})

export default fontSans
