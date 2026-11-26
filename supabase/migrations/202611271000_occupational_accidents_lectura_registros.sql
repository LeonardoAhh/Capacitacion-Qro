-- Admin y analista leen los accidentes (solo lectura) desde Registros del empleado.
-- Crear, editar y borrar sigue siendo de quien gestiona seguridad (Occupational Health).
-- get_my_role() devuelve 'dev' para el analista (202611211000_roles_analista_auxiliar_ehs.sql),
-- así que esta regla cubre dev, analista y admin. Se suma a occupational_accidents_read.
DROP POLICY IF EXISTS occupational_accidents_read_registros ON public.occupational_accidents;
CREATE POLICY occupational_accidents_read_registros ON public.occupational_accidents
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('dev', 'admin'));
