-- Tablero Kanban compartido: todo el equipo (roles dev y admin) ve, crea,
-- edita, mueve y elimina cualquier tarjeta. Los evaluadores no tienen acceso.
-- Creador, último editor y fechas de cambio los registra la base de datos.

CREATE TABLE public.kanban_tarjetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('actividad', 'recordatorio')),
  estado text NOT NULL CHECK (estado IN ('por_hacer', 'pendiente', 'en_progreso', 'concluido')),
  prioridad text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 120),
  descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion) <= 1000),
  fecha_inicio date,
  fecha_limite date,
  responsable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_inicio IS NULL OR fecha_limite IS NULL OR fecha_limite >= fecha_inicio)
);

CREATE INDEX kanban_tarjetas_estado_idx ON public.kanban_tarjetas (estado, fecha_limite);
CREATE INDEX kanban_tarjetas_responsable_idx ON public.kanban_tarjetas (responsable_id);

-- Autoría: no se confía en el cliente.
CREATE OR REPLACE FUNCTION public.kanban_tarjetas_autoria()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := auth.uid();
    NEW.created_at := now();
  ELSE
    NEW.creado_por := OLD.creado_por;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.actualizado_por := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER kanban_tarjetas_autoria_trg
  BEFORE INSERT OR UPDATE ON public.kanban_tarjetas
  FOR EACH ROW EXECUTE FUNCTION public.kanban_tarjetas_autoria();

ALTER TABLE public.kanban_tarjetas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_tarjetas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_tarjetas TO authenticated;

CREATE POLICY kanban_tarjetas_select ON public.kanban_tarjetas
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_tarjetas_insert ON public.kanban_tarjetas
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_tarjetas_update ON public.kanban_tarjetas
  FOR UPDATE TO authenticated USING (public.get_my_role() IN ('dev', 'admin'))
  WITH CHECK (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_tarjetas_delete ON public.kanban_tarjetas
  FOR DELETE TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));

-- Integrantes del tablero (para asignar y mostrar autoría). Lee profiles con
-- SECURITY DEFINER porque cada usuario solo ve su propio perfil.
CREATE OR REPLACE FUNCTION public.kanban_miembros()
RETURNS TABLE (user_id uuid, nombre text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_my_role() IS NULL OR public.get_my_role() NOT IN ('dev', 'admin') THEN
    RAISE EXCEPTION 'No tienes acceso al tablero' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email
    )::text AS nombre
  FROM public.profiles AS p
  WHERE p.user_id IS NOT NULL
    AND p.role IN ('dev', 'admin')
  ORDER BY p.user_id, p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.kanban_miembros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kanban_miembros() TO authenticated;

-- Tiempo real: todos ven los cambios sin recargar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'kanban_tarjetas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_tarjetas;
  END IF;
END
$$;
