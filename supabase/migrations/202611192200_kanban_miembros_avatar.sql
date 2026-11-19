-- kanban_miembros devuelve también la foto de perfil (profiles.avatar_url).
-- Cambia el tipo de retorno, por eso se elimina y se vuelve a crear.
-- Requiere 202611191600_kanban_miembros_activos.sql.

DROP FUNCTION IF EXISTS public.kanban_miembros();

CREATE FUNCTION public.kanban_miembros()
RETURNS TABLE (user_id uuid, nombre text, avatar_url text)
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
    )::text AS nombre,
    nullif(btrim(p.avatar_url), '')::text AS avatar_url
  FROM public.profiles AS p
  JOIN auth.users AS u ON u.id = p.user_id
  WHERE p.role IN ('dev', 'admin')
  ORDER BY p.user_id, p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.kanban_miembros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kanban_miembros() TO authenticated;
