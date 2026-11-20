import localFont from "next/font/local"

// Satoshi (Indian Type Foundry, Fontshare): variable de 300 a 900, con cursivas.
// Licencia: public/fonts/Satoshi-FFL.txt (autohospedaje permitido; no modificar los archivos).
const fontSans = localFont({
  src: [
    { path: "../public/fonts/satoshi-variable.woff2", weight: "300 900", style: "normal" },
    { path: "../public/fonts/satoshi-variable-italic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
})

export default fontSans
