-- Plan anual: un mes puede existir sin cursos; los años se derivan de sus meses.
CREATE TABLE IF NOT EXISTS public.plan_anual_meses (
  anio smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  mes smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anio, mes)
);

CREATE TABLE IF NOT EXISTS public.plan_anual_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio smallint NOT NULL,
  mes smallint NOT NULL,
  orden integer NOT NULL DEFAULT 0 CHECK (orden >= 0),
  nombre text NOT NULL CHECK (length(btrim(nombre)) > 0),
  area_solicitante text NOT NULL CHECK (length(btrim(area_solicitante)) > 0),
  aplica_para text NOT NULL CHECK (length(btrim(aplica_para)) > 0),
  tipo text NOT NULL CHECK (tipo IN ('interno', 'externo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (anio, mes) REFERENCES public.plan_anual_meses (anio, mes) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS plan_anual_cursos_mes_orden_idx
  ON public.plan_anual_cursos (anio, mes, orden, created_at);

ALTER TABLE public.plan_anual_meses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_cursos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.plan_anual_meses, public.plan_anual_cursos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_anual_meses, public.plan_anual_cursos TO authenticated;

CREATE POLICY plan_anual_meses_select ON public.plan_anual_meses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_anual_meses_insert ON public.plan_anual_meses
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_meses_update ON public.plan_anual_meses
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_meses_delete ON public.plan_anual_meses
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

CREATE POLICY plan_anual_cursos_select ON public.plan_anual_cursos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_anual_cursos_insert ON public.plan_anual_cursos
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_cursos_update ON public.plan_anual_cursos
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_cursos_delete ON public.plan_anual_cursos
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

INSERT INTO public.plan_anual_meses (anio, mes)
VALUES (2026, 1), (2026, 2)
ON CONFLICT DO NOTHING;

-- Datos proporcionados para 2026. El conflicto evita duplicarlos al repetir la migración.
INSERT INTO public.plan_anual_cursos (anio, mes, orden, nombre, area_solicitante, aplica_para, tipo)
SELECT 2026, datos.mes, datos.orden, datos.nombre, datos.area_solicitante, datos.aplica_para, datos.tipo
FROM (VALUES
  (1, 1, 'INDUCCIÓN A LA EMPRESA', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 2, 'SISTEMA DE GESTIÓN INTEGRAL', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 3, 'ALERTAS DE CALIDAD Y CATÁLOGO DE FALLAS', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 4, 'FAMILIAS DEL PRODUCTO', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 5, 'METODOLOGÍA 5´S', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 6, 'SEGURIDAD Y PREVENCIÓN DE ACCIDENTES', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 7, 'ASPECTOS E IMPACTOS AMBIENTALES', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 8, 'INSTRUCCIONES DE TRABAJO', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 9, 'REPORTES DE PRODUCCIÓN', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (1, 10, 'AUDITORÍA DE PROCESO EN CAPAS (LPA´S)', 'SGI', 'ÁREAS APLICABLES', 'interno'),
  (1, 11, 'NOM-027-STPS-2008: SOLDADURA Y CORTE – CONDICIONES DE SEGURIDAD E HIGIENE', 'EHS', 'ÁREAS APLICABLES', 'externo'),
  (1, 12, 'NOM-029-STPS-2011: SEGURIDAD EN EL MANTENIMIENTO DE INSTALACIONES ELÉCTRICAS', 'EHS', 'ÁREAS APLICABLES', 'externo'),
  (1, 13, 'ESTRUCTURA DEL SGI Y DOCUMENTOS', 'SGI', 'ÁREAS APLICABLES', 'interno'),
  (1, 14, 'CMM + SCANNER', 'METROLOGÍA', 'METROLOGÍA', 'externo'),
  (2, 1, 'INDUCCIÓN A LA EMPRESA', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 2, 'SISTEMA DE GESTIÓN INTEGRAL', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 3, 'ALERTAS DE CALIDAD Y CATÁLOGO DE FALLAS', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 4, 'FAMILIAS DEL PRODUCTO', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 5, 'METODOLOGÍA 5´S', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 6, 'SEGURIDAD Y PREVENCIÓN DE ACCIDENTES', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 7, 'SEPARACIÓN DE RESIDUOS', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 8, 'ASPECTOS E IMPACTOS AMBIENTALES', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 9, 'INSTRUCCIONES DE TRABAJO', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 10, 'REPORTES DE PRODUCCIÓN', 'RECURSOS HUMANOS', 'NUEVOS INGRESOS', 'interno'),
  (2, 11, 'SISTEMA DE GESTIÓN INTEGRAL', 'SGI', 'TODAS LAS ÁREAS', 'interno'),
  (2, 12, 'DIAGRAMA DE TORTUGA', 'SGI', 'ÁREAS APLICABLES', 'interno'),
  (2, 13, 'OPERACIÓN SEGURA DE MONTACARGAS', 'ALMACÉN', 'ALMACÉN', 'externo'),
  (2, 14, 'CONTROL DE CONTRATISTAS', 'EHS', 'ÁREAS APLICABLES', 'interno')
) AS datos(mes, orden, nombre, area_solicitante, aplica_para, tipo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_anual_cursos c
  WHERE c.anio = 2026 AND c.mes = datos.mes AND c.orden = datos.orden
);
