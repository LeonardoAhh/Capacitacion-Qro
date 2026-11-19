-- Kanban: título y descripción se guardan en mayúsculas, sin espacios
-- repetidos ni al inicio/fin y sin caracteres de control o invisibles.
-- Es la misma regla que aplica la pantalla; aquí se garantiza en la base.
-- Requiere 202611191500_kanban_tablero.sql.

CREATE OR REPLACE FUNCTION public.kanban_normalizar_texto(p_texto text, p_multilinea boolean)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v text := upper(coalesce(p_texto, ''));
BEGIN
  v := regexp_replace(v, '\r\n?', E'\n', 'g');
  v := regexp_replace(v, '[\t ]', ' ', 'g');
  -- Control e invisibles (salto de línea se conserva).
  v := regexp_replace(v, '[\x01-\x09\x0B-\x1F\x7F​-‏ -‮⁠-⁤﻿]', '', 'g');
  IF NOT p_multilinea THEN
    v := replace(v, E'\n', ' ');
  END IF;
  v := regexp_replace(v, ' {2,}', ' ', 'g');
  IF p_multilinea THEN
    v := regexp_replace(v, ' *\n *', E'\n', 'g');
    v := regexp_replace(v, '\n{3,}', E'\n\n', 'g');
  END IF;
  RETURN btrim(v, E' \n');
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_tarjetas_autoria()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
  ELSE
    NEW.creado_por := OLD.creado_por;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.actualizado_por := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Normaliza lo ya capturado sin alterar autoría ni fechas de modificación.
ALTER TABLE public.kanban_tarjetas DISABLE TRIGGER kanban_tarjetas_autoria_trg;
UPDATE public.kanban_tarjetas
SET titulo = public.kanban_normalizar_texto(titulo, false),
    descripcion = public.kanban_normalizar_texto(descripcion, true);
ALTER TABLE public.kanban_tarjetas ENABLE TRIGGER kanban_tarjetas_autoria_trg;
