/**
 * Densidad de la barra lateral y de sus menús (cuenta, espacio de trabajo).
 * En celular filas de 44px; desde md filas compactas de 32px para pantallas de planta,
 * manteniendo texto en body-md (15px).
 */
export const SIDEBAR_ROW = "min-h-11 gap-3 px-3 text-body-md md:min-h-8 md:gap-2 md:px-2"
export const SIDEBAR_ICON_BOX = "size-6 md:size-4"
export const SIDEBAR_ICON = "size-4 md:size-3.5"
/** Título de grupo colapsable: misma altura y sangría que las filas, en eyebrow. */
export const SIDEBAR_GROUP_TRIGGER = "min-h-11 gap-3 px-3 text-eyebrow uppercase md:min-h-8 md:gap-2 md:px-2"

/** Estados de fila compartidos por la navegación y los accesos al pie de la barra. */
export const SIDEBAR_ROW_BASE = "flex w-full items-center rounded-md border border-transparent transition-[background-color,border-color,box-shadow,color] duration-150 motion-reduce:transition-none focus-inset"
export const SIDEBAR_ROW_IDLE = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
export const SIDEBAR_ROW_ACTIVE = "border-sidebar-border bg-sidebar-active font-medium text-foreground shadow-(--sidebar-active-shadow)"
/** Opciones de los menús desplegables de la barra lateral. */
export const SIDEBAR_MENU_ROW = "min-h-11 text-body-md font-normal md:min-h-8 md:[&_svg]:size-3.5"
export const SIDEBAR_MENU_ITEM = `${SIDEBAR_MENU_ROW} gap-2.5 px-2 md:gap-2`
