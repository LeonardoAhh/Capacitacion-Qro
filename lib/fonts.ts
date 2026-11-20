import localFont from "next/font/local"

// Mona Sans (GitHub): Regular, Medium y Bold. El peso 600 usa Bold.
// Licencia: public/fonts/MonaSans-OFL.txt.
const fontSans = localFont({
  src: [
    { path: "../public/fonts/MonaSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/MonaSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/MonaSans-Bold.woff2", weight: "600 700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
})

export default fontSans
