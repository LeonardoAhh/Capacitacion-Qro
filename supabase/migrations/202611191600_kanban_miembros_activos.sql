-- kanban_miembros: solo perfiles cuya cuenta existe en auth.users. Un perfil
-- huérfano (cuenta eliminada) ya no aparece como responsable.
-- Requiere 202611191500_kanban_tablero.sql.

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
  JOIN auth.users AS u ON u.id = p.user_id
  WHERE p.role IN ('dev', 'admin')
  ORDER BY p.user_id, p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.kanban_miembros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kanban_miembros() TO authenticated;
