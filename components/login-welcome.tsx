import { LOGIN, loginStyles } from "@/lib/login/presentation"

/** Título del formulario: h1 cuando ocupa la pantalla sola, h2 junto a la presentación. */
export default function LoginWelcome({ as: Heading = "h1" }: { as?: "h1" | "h2" }) {
  return (
    <header className="space-y-2">
      <Heading id="login-title" className={loginStyles.heading}>
        {LOGIN.title}
      </Heading>
      <p id="login-description" className={loginStyles.description}>
        {LOGIN.description}
      </p>
    </header>
  )
}
