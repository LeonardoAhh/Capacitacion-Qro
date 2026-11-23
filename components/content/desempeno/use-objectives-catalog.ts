"use client";

import { useMemo, useState } from "react";
import { DEFAULT_OBJETIVOS_POR_TIPO } from "@/lib/types/desempeno";
import { OBJETIVOS_POR_PUESTO } from "@/lib/desempeno/objetivos-catalogo";
import { CATALOGO_ORGANIZACIONAL, getTipoDesempenoByPuesto } from "@/lib/catalogo";

/** Estado del catálogo de objetivos: el puesto elegido y sus objetivos SMART. */
export function useObjectivesCatalog() {
  const departamentos = useMemo(() => Object.entries(CATALOGO_ORGANIZACIONAL), []);
  const [puesto, setPuesto] = useState("");
  const tipoLabel = puesto ? getTipoDesempenoByPuesto(puesto) : null;
  const hasPuestoObjetivos = puesto ? !!OBJETIVOS_POR_PUESTO[puesto] : false;
  // Sin objetivos propios del puesto se usan los generales de su tipo de evaluación.
  const objetivos = !puesto ? [] : OBJETIVOS_POR_PUESTO[puesto] ?? DEFAULT_OBJETIVOS_POR_TIPO[getTipoDesempenoByPuesto(puesto)];
  return { departamentos, puesto, setPuesto, tipoLabel, hasPuestoObjetivos, objetivos };
}

export type ObjectivesCatalogContext = ReturnType<typeof useObjectivesCatalog>;
