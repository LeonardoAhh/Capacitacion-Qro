-- Los cursos tomados se conservan al borrar un empleado.
-- Antes employee_courses.employee_id tenía ON DELETE CASCADE: al borrar a alguien
-- se perdían sus cursos y bajaban los indicadores históricos de capacitación.
-- Ahora cada curso guarda número, nombre y departamento del empleado; al borrarlo
-- solo se pierde el vínculo (employee_id queda en NULL) y el curso sigue contando.

ALTER TABLE public.employee_courses
  ADD COLUMN IF NOT EXISTS numero_empleado text,
  ADD COLUMN IF NOT EXISTS nombre_empleado text,
  ADD COLUMN IF NOT EXISTS departamento_empleado text;

UPDATE public.employee_courses AS ec
SET numero_empleado = e.numero,
    nombre_empleado = e.nombre,
    departamento_empleado = e.departamento
FROM public.employees AS e
WHERE e.id = ec.employee_id;

ALTER TABLE public.employee_courses
  ALTER COLUMN employee_id DROP NOT NULL;

ALTER TABLE public.employee_courses
  DROP CONSTRAINT IF EXISTS employee_courses_employee_id_fkey;

ALTER TABLE public.employee_courses
  ADD CONSTRAINT employee_courses_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employee_courses_numero_empleado_idx
  ON public.employee_courses (numero_empleado);

-- Al registrar o mover un curso, copia los datos actuales del empleado.
CREATE OR REPLACE FUNCTION public.employee_courses_copiar_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT numero, nombre, departamento
      INTO NEW.numero_empleado, NEW.nombre_empleado, NEW.departamento_empleado
      FROM public.employees
     WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_courses_copiar_empleado ON public.employee_courses;
CREATE TRIGGER employee_courses_copiar_empleado
  BEFORE INSERT OR UPDATE OF employee_id ON public.employee_courses
  FOR EACH ROW EXECUTE FUNCTION public.employee_courses_copiar_empleado();

-- Mientras el empleado exista, sus cursos siguen sus cambios de número, nombre o departamento;
-- al borrarlo quedan con los últimos datos que tuvo.
CREATE OR REPLACE FUNCTION public.employees_actualizar_cursos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.employee_courses
     SET numero_empleado = NEW.numero,
         nombre_empleado = NEW.nombre,
         departamento_empleado = NEW.departamento
   WHERE employee_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_actualizar_cursos ON public.employees;
CREATE TRIGGER employees_actualizar_cursos
  AFTER UPDATE OF numero, nombre, departamento ON public.employees
  FOR EACH ROW
  WHEN (
    OLD.numero IS DISTINCT FROM NEW.numero
    OR OLD.nombre IS DISTINCT FROM NEW.nombre
    OR OLD.departamento IS DISTINCT FROM NEW.departamento
  )
  EXECUTE FUNCTION public.employees_actualizar_cursos();

-- Lectura: los cursos vinculados siguen la regla de siempre; los de empleados
-- borrados se leen con el número guardado en el propio curso.
DROP POLICY IF EXISTS employee_courses_select ON public.employee_courses;
CREATE POLICY employee_courses_select ON public.employee_courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = employee_id AND public.can_evaluate_employee(numero)
    )
    OR (employee_id IS NULL AND public.can_evaluate_employee(numero_empleado))
  );
