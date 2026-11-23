-- Aviso de práctica en /desempeno: se muestra al evaluador hasta que practica o lo
-- cierra una vez. Se guarda en su perfil para no repetirlo en otra visita ni en
-- otro dispositivo. Cada quien actualiza su propio perfil (políticas existentes).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS desempeno_practica_vista boolean NOT NULL DEFAULT false;
