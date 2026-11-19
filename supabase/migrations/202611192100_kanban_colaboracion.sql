-- Kanban, colaboración:
--  · kanban_checklist: pasos dentro de una tarjeta.
--  · kanban_comentarios: hilo breve por tarjeta.
--  · kanban_avisos: avisos dentro del sistema (asignación, colaborador,
--    apoyo tomado y comentarios). Solo los crea la base de datos.
-- Requiere 202611192000_kanban_normalizar_regex.sql. Idempotente.

-- ─── Checklist ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kanban_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarjeta_id uuid NOT NULL REFERENCES public.kanban_tarjetas(id) ON DELETE CASCADE,
  texto text NOT NULL,
  hecho boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kanban_checklist_texto_check CHECK (length(texto) BETWEEN 1 AND 200)
);
CREATE INDEX IF NOT EXISTS kanban_checklist_tarjeta_idx ON public.kanban_checklist (tarjeta_id, created_at);

CREATE OR REPLACE FUNCTION public.kanban_checklist_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.texto := public.kanban_normalizar_texto(NEW.texto, false);
  IF NEW.texto !~ '[[:alpha:][:digit:]]' THEN
    RAISE EXCEPTION 'El paso debe tener al menos una letra o un número' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' AND (SELECT count(*) FROM public.kanban_checklist WHERE tarjeta_id = NEW.tarjeta_id) >= 30 THEN
    RAISE EXCEPTION 'La tarjeta ya tiene 30 pasos' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.tarjeta_id := OLD.tarjeta_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kanban_checklist_normalizar_trg ON public.kanban_checklist;
CREATE TRIGGER kanban_checklist_normalizar_trg
  BEFORE INSERT OR UPDATE ON public.kanban_checklist
  FOR EACH ROW EXECUTE FUNCTION public.kanban_checklist_normalizar();

ALTER TABLE public.kanban_checklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_checklist FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_checklist TO authenticated;

DROP POLICY IF EXISTS kanban_checklist_equipo ON public.kanban_checklist;
CREATE POLICY kanban_checklist_equipo ON public.kanban_checklist
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('dev', 'admin'))
  WITH CHECK (public.get_my_role() IN ('dev', 'admin'));

-- ─── Comentarios ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kanban_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarjeta_id uuid NOT NULL REFERENCES public.kanban_tarjetas(id) ON DELETE CASCADE,
  autor_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kanban_comentarios_texto_check CHECK (length(texto) BETWEEN 1 AND 1000)
);
CREATE INDEX IF NOT EXISTS kanban_comentarios_tarjeta_idx ON public.kanban_comentarios (tarjeta_id, created_at);

CREATE OR REPLACE FUNCTION public.kanban_comentarios_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.texto := public.kanban_normalizar_texto(NEW.texto, true);
  IF NEW.texto !~ '[[:alpha:][:digit:]]' THEN
    RAISE EXCEPTION 'El comentario debe tener al menos una letra o un número' USING ERRCODE = 'check_violation';
  END IF;
  NEW.autor_id := auth.uid();
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kanban_comentarios_normalizar_trg ON public.kanban_comentarios;
CREATE TRIGGER kanban_comentarios_normalizar_trg
  BEFORE INSERT ON public.kanban_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.kanban_comentarios_normalizar();

ALTER TABLE public.kanban_comentarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_comentarios FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.kanban_comentarios TO authenticated;

DROP POLICY IF EXISTS kanban_comentarios_select ON public.kanban_comentarios;
DROP POLICY IF EXISTS kanban_comentarios_insert ON public.kanban_comentarios;
DROP POLICY IF EXISTS kanban_comentarios_delete ON public.kanban_comentarios;
CREATE POLICY kanban_comentarios_select ON public.kanban_comentarios
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY kanban_comentarios_insert ON public.kanban_comentarios
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid() AND public.get_my_role() IN ('dev', 'admin'));
-- Cada quien elimina solo sus comentarios.
CREATE POLICY kanban_comentarios_delete ON public.kanban_comentarios
  FOR DELETE TO authenticated USING (autor_id = auth.uid());

-- ─── Avisos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kanban_avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarjeta_id uuid REFERENCES public.kanban_tarjetas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('asignada', 'colaborador', 'apoyo_tomado', 'comentario')),
  -- Copias al momento del aviso: se leen sin consultar otras tablas.
  titulo text NOT NULL,
  actor_nombre text,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_avisos_usuario_idx ON public.kanban_avisos (user_id, created_at DESC);

ALTER TABLE public.kanban_avisos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kanban_avisos FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.kanban_avisos TO authenticated;
GRANT UPDATE (leido) ON public.kanban_avisos TO authenticated;

DROP POLICY IF EXISTS kanban_avisos_select ON public.kanban_avisos;
DROP POLICY IF EXISTS kanban_avisos_update ON public.kanban_avisos;
DROP POLICY IF EXISTS kanban_avisos_delete ON public.kanban_avisos;
CREATE POLICY kanban_avisos_select ON public.kanban_avisos
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY kanban_avisos_update ON public.kanban_avisos
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY kanban_avisos_delete ON public.kanban_avisos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Mismo nombre que muestra kanban_miembros.
CREATE OR REPLACE FUNCTION public.kanban_nombre_usuario(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    p.email
  )::text
  FROM public.profiles AS p
  WHERE p.user_id = p_user
  ORDER BY p.created_at
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.kanban_nombre_usuario(uuid) FROM PUBLIC, anon, authenticated;

-- Crea un aviso; nunca para quien hace el cambio ni para quien no usa el tablero.
CREATE OR REPLACE FUNCTION public.kanban_avisar(p_user uuid, p_tarjeta uuid, p_tipo text, p_titulo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user IS NULL OR p_user = auth.uid() THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user AND role IN ('dev', 'admin')) THEN
    RETURN;
  END IF;
  INSERT INTO public.kanban_avisos (user_id, tarjeta_id, tipo, titulo, actor_nombre)
  VALUES (p_user, p_tarjeta, p_tipo, p_titulo, public.kanban_nombre_usuario(auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.kanban_avisar(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kanban_tarjetas_avisos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_colaborador uuid;
BEGIN
  -- El siguiente recordatorio lo crea la base de datos: no genera avisos.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id THEN
    PERFORM public.kanban_avisar(NEW.responsable_id, NEW.id, 'asignada', NEW.titulo);
  END IF;

  FOREACH v_colaborador IN ARRAY NEW.colaboradores LOOP
    IF TG_OP = 'INSERT' OR NOT (v_colaborador = ANY (OLD.colaboradores)) THEN
      PERFORM public.kanban_avisar(v_colaborador, NEW.id, 'colaborador', NEW.titulo);
    END IF;
  END LOOP;

  -- Alguien que no participaba atendió el pedido de apoyo.
  IF TG_OP = 'UPDATE' AND OLD.necesita_apoyo AND NOT NEW.necesita_apoyo
     AND auth.uid() IS DISTINCT FROM OLD.responsable_id
     AND NOT (auth.uid() = ANY (OLD.colaboradores))
     AND (NEW.responsable_id = auth.uid() OR auth.uid() = ANY (NEW.colaboradores)) THEN
    PERFORM public.kanban_avisar(coalesce(OLD.responsable_id, NEW.creado_por), NEW.id, 'apoyo_tomado', NEW.titulo);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS kanban_tarjetas_avisos_trg ON public.kanban_tarjetas;
CREATE TRIGGER kanban_tarjetas_avisos_trg
  AFTER INSERT OR UPDATE ON public.kanban_tarjetas
  FOR EACH ROW EXECUTE FUNCTION public.kanban_tarjetas_avisos();

-- Comentario: avisa a quienes participan en la tarjeta y a quien la creó.
CREATE OR REPLACE FUNCTION public.kanban_comentarios_avisos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tarjeta public.kanban_tarjetas%ROWTYPE;
  v_destino uuid;
BEGIN
  SELECT * INTO v_tarjeta FROM public.kanban_tarjetas WHERE id = NEW.tarjeta_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  FOR v_destino IN
    SELECT DISTINCT destino
    FROM unnest(array_append(array_append(v_tarjeta.colaboradores, v_tarjeta.responsable_id), v_tarjeta.creado_por)) AS destino
    WHERE destino IS NOT NULL
  LOOP
    PERFORM public.kanban_avisar(v_destino, v_tarjeta.id, 'comentario', v_tarjeta.titulo);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS kanban_comentarios_avisos_trg ON public.kanban_comentarios;
CREATE TRIGGER kanban_comentarios_avisos_trg
  AFTER INSERT ON public.kanban_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.kanban_comentarios_avisos();

-- ─── Tiempo real ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tabla text;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['kanban_checklist', 'kanban_comentarios', 'kanban_avisos'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_tabla
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tabla);
    END IF;
  END LOOP;
END
$$;
