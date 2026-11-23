import { PostLoginLoading } from "@/components/post-login-loading"

/**
 * Transición post-login.
 * Muestra la pantalla de carga animada, resuelve el rol del usuario
 * y redirige a la ruta correcta:
 *   - evaluador     → su inicio fijo (/desempeno)
 *   - demás roles   → selección de workspace
 */
export default function AuthRedirectPage() {
  return <PostLoginLoading />
}
