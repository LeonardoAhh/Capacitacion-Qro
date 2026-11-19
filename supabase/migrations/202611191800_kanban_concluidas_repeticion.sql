-- Kanban:
--  · concluido_at: cuándo se concluyó (para ocultar las concluidas antiguas).
--  · repeticion: recordatorios semanales o mensuales. Al concluir uno se crea
--    el siguiente con las fechas recorridas; siguiente_id evita duplicarlo si
--    la tarjeta se reabre y se vuelve a concluir.
-- Requiere 202611191700_kanban_textos_mayusculas.sql.

-- Idempotente: se puede volver a correr si una ejecución anterior quedó a medias.
ALTER TABLE public.kanban_tarjetas
  ADD COLUMN IF NOT EXISTS concluido_at timestamptz,
  ADD COLUMN IF NOT EXISTS repeticion text NOT NULL DEFAULT 'ninguna',
  ADD COLUMN IF NOT EXISTS siguiente_id uuid REFERENCES public.kanban_tarjetas(id) ON DELETE SET NULL;

-- Valores permitidos y requisito de repetición: solo recordatorios con fecha límite.
ALTER TABLE public.kanban_tarjetas DROP CONSTRAINT IF EXISTS kanban_tarjetas_repeticion_check;
ALTER TABLE public.kanban_tarjetas DROP CONSTRAINT IF EXISTS kanban_tarjetas_repeticion_requisitos_check;
ALTER TABLE public.kanban_tarjetas
  ADD CONSTRAINT kanban_tarjetas_repeticion_check
    CHECK (repeticion IN ('ninguna', 'semanal', 'mensual')),
  ADD CONSTRAINT kanban_tarjetas_repeticion_requisitos_check
    CHECK (repeticion = 'ninguna' OR (tipo = 'recordatorio' AND fecha_limite IS NOT NULL));

CREATE OR REPLACE FUNCTION public.kanban_tarjetas_autoria()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_paso interval;
  v_siguiente uuid;
BEGIN
  NEW.titulo := public.kanban_normalizar_texto(NEW.titulo, false);
  NEW.descripcion := public.kanban_normalizar_texto(NEW.descripcion, true);
  IF NEW.titulo !~ '[[:alpha:][:digit:]]' THEN
    RAISE EXCEPTION 'El título debe tener al menos una letra o un número'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := auth.uid();
    NEW.created_at := now();
    NEW.siguiente_id := NULL;
    NEW.concluido_at := CASE WHEN NEW.estado = 'concluido' THEN now() END;
  ELSE
    NEW.creado_por := OLD.creado_por;
    NEW.created_at := OLD.created_at;
    NEW.siguiente_id := OLD.siguiente_id;
    NEW.concluido_at := CASE
      WHEN NEW.estado <> 'concluido' THEN NULL
      WHEN OLD.estado = 'concluido' THEN OLD.concluido_at
      ELSE now()
    END;

    -- Al concluir un recordatorio que se repite, se crea el siguiente (una sola vez).
    IF NEW.estado = 'concluido' AND OLD.estado <> 'concluido'
       AND NEW.repeticion <> 'ninguna' AND OLD.siguiente_id IS NULL THEN
      v_paso := CASE NEW.repeticion WHEN 'semanal' THEN interval '7 days' ELSE interval '1 month' END;
      INSERT INTO public.kanban_tarjetas (
        tipo, estado, prioridad, titulo, descripcion, fecha_inicio, fecha_limite,
        responsable_id, repeticion
      ) VALUES (
        NEW.tipo, 'por_hacer', NEW.prioridad, NEW.titulo, NEW.descripcion,
        (NEW.fecha_inicio + v_paso)::date, (NEW.fecha_limite + v_paso)::date,
        NEW.responsable_id, NEW.repeticion
      ) RETURNING id INTO v_siguiente;
      NEW.siguiente_id := v_siguiente;
    END IF;
  END IF;

  NEW.actualizado_por := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Las ya concluidas toman como fecha de conclusión su última modificación.
ALTER TABLE public.kanban_tarjetas DISABLE TRIGGER kanban_tarjetas_autoria_trg;
UPDATE public.kanban_tarjetas SET concluido_at = updated_at WHERE estado = 'concluido';
ALTER TABLE public.kanban_tarjetas ENABLE TRIGGER kanban_tarjetas_autoria_trg;
