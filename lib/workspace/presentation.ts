export const WORKSPACE_SELECTION = {
  pageTitle: "Elegir espacio de trabajo",
  pageDescription: "Selecciona el espacio de trabajo de ViñoPlastic al que deseas ingresar.",
  regionLabel: "Elegir espacio de trabajo",
  heading: "Elige tu workspace.",
  subtitle: "¡Tu perfil, tu workspace!",
  logout: "Cerrar sesión",
  loggingOut: "Cerrando sesión…",
  loading: "Cargando espacios de trabajo…",
  noAccess: "Sin acceso para tu rol",
  postLogin: {
    checkingAccess: "Verificando acceso…",
    preparing: "Preparando espacios de trabajo…",
    redirecting: "Redirigiendo…",
  },
} as const

export const workspaceStyles = {
  backdropInner: "flex min-h-dvh flex-col md:h-full md:min-h-0",
  topBar: "flex items-center justify-end gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6 md:pt-6",
  region:
    "surface-enter flex flex-1 items-center justify-center overflow-y-auto px-4 pb-8 pt-4 safe-bottom-content text-center sm:px-6 md:pb-12",
  content: "w-full max-w-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
  heading: "text-heading-lg text-foreground sm:text-display-xl md:text-display-2xl",
  subtitle: "mt-2 text-body-md text-muted-foreground sm:mt-3",
  grid: "mx-auto mt-6 grid max-w-60 grid-cols-1 gap-4 sm:mt-8 sm:max-w-xl sm:grid-cols-2 sm:gap-6",
  optionButton:
    "group relative grid min-h-11 gap-2 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed sm:gap-3",
  optionLabel: "text-balance text-center text-label-sm text-foreground",
  optionNote: "-mt-2 text-balance text-center text-body-sm text-muted-foreground",
} as const
