-- Corrige kanban_normalizar_texto: los caracteres invisibles del filtro iban
-- escritos literalmente y se pierden al copiar el SQL, lo que deja un rango
-- inválido ("invalid regular expression: invalid character range").
-- Ahora se escriben con escapes \u, que sobreviven a cualquier copia.
-- Requiere 202611191700_kanban_textos_mayusculas.sql.

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
  v := regexp_replace(v, '[\t ]', ' ', 'g');
  -- Control e invisibles (el salto de línea se conserva): C0 sin \n, DEL,
  -- marcas de ancho cero y dirección, separadores de línea/párrafo y BOM.
  v := regexp_replace(v, '[\x01-\x09\x0B-\x1F\x7F\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]', '', 'g');
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
