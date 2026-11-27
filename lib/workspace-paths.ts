export const WORKSPACE_SELECTION_PATH = "/workspace"
export const TRAINING_WORKSPACE_PATH = "/kanban"
export const SAFETY_HOME_PATH = "/ehs"
/** Espacio de Seguridad e Higiene: se registra en SAFETY_ROUTES (lib/constants/roles). */
export const OCCUPATIONAL_HEALTH_PATH = "/salud-ocupacional"
/** Indicadores de Seguridad e Higiene: cuelga de /ehs, así pertenece a ese espacio. */
export const SAFETY_INDICATORS_PATH = "/ehs/indicadores"
/** Reportes semanales en PDF de Seguridad e Higiene. */
export const SAFETY_REPORTS_PATH = "/ehs/reportes"
/** Lista de ideas de mejora: solo la revisa quien tiene canReviewIdeas (lib/constants/roles). */
export const IDEAS_PATH = "/ideas"
