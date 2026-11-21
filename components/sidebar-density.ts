/**
 * Densidad de la barra lateral y de sus menús (cuenta, espacio de trabajo).
 * En celular se usa con el dedo: filas de 44px. Desde md las filas son compactas
 * para que en las pantallas chicas de planta la navegación quepa sin scroll;
 * el texto se mantiene en 14px para leerse bien.
 */
export const SIDEBAR_ROW = "min-h-11 gap-3 px-3 text-body-md md:min-h-8 md:gap-2 md:px-2"
export const SIDEBAR_ICON_BOX = "size-6 md:size-4"
export const SIDEBAR_ICON = "size-4 md:size-3.5"
/** Opciones de los menús desplegables de la barra lateral. */
export const SIDEBAR_MENU_ROW = "min-h-11 text-body-md font-normal md:min-h-8 md:[&_svg]:size-3.5"
export const SIDEBAR_MENU_ITEM = `${SIDEBAR_MENU_ROW} gap-2.5 px-2 md:gap-2`
