# Importación de incumplimientos y actas administrativas

## Formato compartido

Ambas importaciones aceptan un arreglo JSON con `numero_empleado`, `mes` en formato `YYYY-MM` y las cantidades por día en propiedades numéricas (`"1"` a `"31"`). Un archivo puede incluir varios meses y el mismo empleado en meses distintos, pero no repetir al empleado dentro del mismo mes. Los conteos pueden ser enteros o cadenas de dígitos; no se aceptan negativos ni fracciones. Los ceros no se guardan y los días fuera del mes solo se aceptan con valor cero.

```json
[
  {
    "1": "0",
    "23": "2",
    "numero_empleado": "2160",
    "mes": "2026-06"
  },
  {
    "1": "1",
    "numero_empleado": "2160",
    "mes": "2026-07"
  }
]
```

Para actas administrativas, cada cantidad positiva crea esa cantidad de actas con la misma fecha. Los registros importados se crean con estatus `ACTIVO`, sin descripción ni fecha de revisión.

## Importación de incumplimientos

El apartado **Incumplimiento** de `/plantilla/empleado/[numeroEmpleado]?seccion=incumplimientos` muestra solo días con conteo mayor que cero del empleado seleccionado.

La importación se inicia desde el botón **Cargar incumplimientos** en la barra superior de la tabla de empleados de `/plantilla`. La ficha individual es de consulta.

El rol `dev` también puede capturar un incumplimiento desde la ficha individual. Solo se permite un registro por empleado y fecha. Si ya hay uno, la ficha muestra la cantidad existente y solicita confirmar antes de actualizar la cantidad total; si el registro cambió mientras se confirmaba, el guardado se rechaza para volver a validar los datos. Esta captura usa `public.registrar_incumplimiento_reglamento`.

## Reemplazo mensual

Cada acción reemplaza, en una única transacción, todos los registros de cada mes presente en el archivo para todos los empleados. Los meses no incluidos permanecen intactos. Empleados omitidos quedan fuera de los meses reemplazados. Un mes sin valores positivos vacía los datos existentes de ese mes. Si falla la validación o escritura de cualquier mes, no se aplica ninguno. Todos los números de empleado del archivo deben existir en Plantilla (`public.employees`): la vista previa lista los faltantes y bloquea la carga, y la base de datos rechaza la importación completa si falta alguno (`202611181300_importaciones_validar_empleados.sql`). Aplica a incumplimientos, actas administrativas y retardos.

La tabla `public.incumplimientos_reglamento` guarda una fila por empleado, mes y día con incumplimientos. RLS limita lectura a empleados permitidos por `can_evaluate_employee`; solo el rol `dev` puede importar o borrar. La operación atómica vive en `public.reemplazar_meses_incumplimientos_reglamento`.

La tabla `public.actas_seguimiento` conserva actas administrativas; los planes de seguimiento se eliminan. La importación se expone junto a la de incumplimientos en `/plantilla` y está limitada al rol `dev`. `public.reemplazar_meses_actas_administrativas` reemplaza las actas de todos los meses incluidos en una sola transacción.

La migración `202611091300_multi_month_employee_day_imports.sql` agrega las RPC para carga de varios meses. Debe aplicarse en Supabase antes de usar este formato actualizado.

## Retardos

El apartado **Retardos** de `/plantilla/empleado/[numeroEmpleado]?seccion=retardos` muestra los retardos del empleado por mes y día. Se abre desde la opción **Retardos** del menú de acciones de cada empleado en `/plantilla`.

Cada día guarda la cantidad de retardos y los minutos totales. El rol `dev` captura desde la ficha con las mismas reglas que los incumplimientos: un registro por empleado y fecha, confirmación antes de actualizar el total y rechazo si el registro cambió mientras se confirmaba.

### Importación de retardos

Se inicia desde **Cargar información → Retardos** en `/plantilla` (rol `dev`). Acepta el reporte con una fila por retardo:

```json
[
  {
    "NOMINA": "330",
    "NOMBRE": "SANCHEZ HERNANDEZ MARICELA",
    "FECHA": "15/10/2026",
    "TIEMPO DE RETARDO": "8",
    "RETARDO": "SI"
  }
]
```

`FECHA` usa `dd/mm/aaaa` y `TIEMPO DE RETARDO` son minutos enteros (se aceptan 0). Las filas con `RETARDO` distinto de `SI` se omiten. Las filas se agrupan por empleado y día: cada una suma 1 retardo y sus minutos. Como en incumplimientos, se reemplazan completos los meses incluidos en el archivo, en una sola transacción (`public.reemplazar_meses_retardos`). La migración `202611181100_retardos_minutos_importacion.sql` agrega los minutos y esta RPC.

La tabla `public.retardos` guarda una fila por empleado, mes y día. RLS limita la lectura con `can_evaluate_employee`; la escritura solo ocurre por `public.registrar_retardo`. Las migraciones `202611181000_retardos.sql` y `202611181100_retardos_minutos_importacion.sql` deben aplicarse en Supabase, en ese orden, antes de usar la ficha.

Incumplimientos y Retardos comparten la ficha genérica `RegistrosPorDiaPage` (`components/content/registros-por-dia-page.tsx`); cada tipo solo define su tabla, su RPC y sus textos en `lib/plantilla/registros-por-dia.ts`.
