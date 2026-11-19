-- Kanban para trabajo en equipo:
--  · Pedir apoyo (apoyo_nota) y marcar bloqueo (bloqueo_motivo) en la tarjeta.
--  · Colaboradores además del responsable.
--  · "Mi día": selección personal y diaria de tarjetas (cada quien ve la suya).
--  · Plantillas compartidas para crear tarjetas de procesos repetidos.
-- Requiere 202611191800_kanban_concluidas_repeticion.sql. Idempotente.

ALTER TABLE public.kanban_tarjetas
  ADD COLUMN IF NOT EXISTS necesita_apoyo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apoyo_nota text,
  ADD COLUMN IF NOT EXISTS bloqueo_motivo text,
  ADD COLUMN IF NOT EXISTS colaboradores uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.kanban_tarjetas DROP CONSTRAINT IF EXISTS kanban_tarjetas_apoyo_nota_check;
ALTER TABLE public.kanban_tarjetas DROP CONSTRAINT IF EXISTS kanban_tarjetas_bloqueo_motivo_check;
ALTER TABLE public.kanban_tarjetas DROP CONSTRAINT IF EXISTS kanban_tarjetas_colaboradores_check;
ALTER TABLE public.kanban_tarjetas
  ADD CONSTRAINT kanban_tarjetas_apoyo_nota_check
    CHECK (apoyo_nota IS NULL OR (necesita_apoyo AND length(apoyo_nota) BETWEEN 1 AND 200)),
  ADD CONSTRAINT kanban_tarjetas_bloqueo_motivo_check
    CHECK (bloqueo_motivo IS NULL OR length(bloqueo_motivo) BETWEEN 1 AND 200),
  ADD CONSTRAINT kanban_tarjetas_colaboradores_check
    CHECK (cardinality(colaboradores) <= 10);

-- Normalización de las notas nuevas con la misma regla que título y descripción.
CREATE OR REPLACE FUNCTION public.kanban_tarjetas_notas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.apoyo_nota := nullif(public.kanban_normalizar_texto(NEW.apoyo_nota, false), '');
  NEW.bloqueo_motivo := nullif(public.kanban_normalizar_texto(NEW.bloqueo_motivo, false), '');
  IF NOT NEW.necesita_apoyo THEN
    NEW.apoyo_nota := NULL;
  END IF;
  -- Sin duplicados y sin repetir al responsable entre los colaboradores.
  NEW.colaboradores := coalesce((
    SELECT array_agg(DISTINCT colaborador)
    FROM unnest(NEW.colaboradores) AS colaborador
    WHERE colaborador IS DISTINCT FROM NEW.responsable_id
  ), '{}');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kanban_tarjetas_notas_trg ON public.kanban_tarjetas;
CREATE TRIGGER kanban_tarjetas_notas_trg
  BEFORE INSERT OR UPDATE ON public.kanban_tarjetas
  FOR EACH ROW EXECUTE FUNCTION public.kanban_tarjetas_notas();

-- Mi día: una fila por persona, tarjeta y fecha. Cada quien solo ve y edita lo suyo.
CREATE TABLE IF NOT EXISTS public.kanban_mi_dia (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tarjeta_id uuid NOT NULL REFERENCES public.kanban_tarjetas(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tarjeta_id, fecha)
);

ALTER TABLE public.kanban_mi_dia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_mi_dia FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.kanban_mi_dia TO authenticated;

DROP POLICY IF EXISTS kanban_mi_dia_select ON public.kanban_mi_dia;
DROP POLICY IF EXISTS kanban_mi_dia_insert ON public.kanban_mi_dia;
DROP POLICY IF EXISTS kanban_mi_dia_delete ON public.kanban_mi_dia;
CREATE POLICY kanban_mi_dia_select ON public.kanban_mi_dia
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_mi_dia_insert ON public.kanban_mi_dia
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_mi_dia_delete ON public.kanban_mi_dia
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Plantillas compartidas por el equipo.
CREATE TABLE IF NOT EXISTS public.kanban_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 120),
  tipo text NOT NULL CHECK (tipo IN ('actividad', 'recordatorio')),
  prioridad text NOT NULL CHECK (prioridad IN ('alta', 'media', 'baja')),
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 120),
  descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion) <= 1000),
  repeticion text NOT NULL DEFAULT 'ninguna' CHECK (repeticion IN ('ninguna', 'semanal', 'mensual')),
  creado_por uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.kanban_plantillas_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.nombre := public.kanban_normalizar_texto(NEW.nombre, false);
  NEW.titulo := public.kanban_normalizar_texto(NEW.titulo, false);
  NEW.descripcion := public.kanban_normalizar_texto(NEW.descripcion, true);
  NEW.creado_por := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kanban_plantillas_normalizar_trg ON public.kanban_plantillas;
CREATE TRIGGER kanban_plantillas_normalizar_trg
  BEFORE INSERT ON public.kanban_plantillas
  FOR EACH ROW EXECUTE FUNCTION public.kanban_plantillas_normalizar();

ALTER TABLE public.kanban_plantillas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_plantillas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.kanban_plantillas TO authenticated;

DROP POLICY IF EXISTS kanban_plantillas_select ON public.kanban_plantillas;
DROP POLICY IF EXISTS kanban_plantillas_insert ON public.kanban_plantillas;
DROP POLICY IF EXISTS kanban_plantillas_delete ON public.kanban_plantillas;
CREATE POLICY kanban_plantillas_select ON public.kanban_plantillas
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_plantillas_insert ON public.kanban_plantillas
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_plantillas_delete ON public.kanban_plantillas
  FOR DELETE TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kanban_plantillas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_plantillas;
  END IF;
END
$$;
