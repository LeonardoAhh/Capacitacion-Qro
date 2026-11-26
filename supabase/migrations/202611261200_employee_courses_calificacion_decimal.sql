-- Calificaciones de cursos con decimales (p. ej. 9.7).
-- Antes era INTEGER; los valores existentes se conservan tal cual. numeric(5, 2) también
-- admite calificaciones viejas en escala de 100. El rango 0-10 de las cargas nuevas lo
-- valida la carga de cursos: una restricción aquí haría fallar cualquier actualización
-- de esas filas viejas (por ejemplo, el trigger que copia los datos del empleado).
ALTER TABLE public.employee_courses
  ALTER COLUMN calificacion TYPE numeric(5, 2) USING calificacion::numeric(5, 2);
