-- Occupational Health: severidad, incapacidad y seguimiento por tipo de atención.
-- Cada dato depende de otro (incapacidad de riesgo de trabajo, reposo de servicio
-- médico, pasos de clínica e IMSS de esa atención); los CHECK impiden combinaciones
-- sin sentido aunque se escriba fuera de la app.
ALTER TABLE public.occupational_accidents
  ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('alta', 'media', 'baja')),
  ADD COLUMN IF NOT EXISTS disability boolean,
  ADD COLUMN IF NOT EXISTS disability_days smallint CHECK (disability_days BETWEEN 1 AND 365),
  ADD COLUMN IF NOT EXISTS rest_days smallint CHECK (rest_days BETWEEN 1 AND 365),
  ADD COLUMN IF NOT EXISTS rest_paid boolean,
  ADD COLUMN IF NOT EXISTS clinic_requisition boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clinic_payment_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imss_st7 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imss_st2 boolean NOT NULL DEFAULT false;

ALTER TABLE public.occupational_accidents
  DROP CONSTRAINT IF EXISTS occupational_accidents_disability_check,
  DROP CONSTRAINT IF EXISTS occupational_accidents_rest_check,
  DROP CONSTRAINT IF EXISTS occupational_accidents_clinic_check,
  DROP CONSTRAINT IF EXISTS occupational_accidents_imss_check;

ALTER TABLE public.occupational_accidents
  -- Incapacidad solo con riesgo de trabajo, y con días solo si la hubo.
  ADD CONSTRAINT occupational_accidents_disability_check CHECK (
    (work_risk OR disability IS NULL)
    AND ((disability IS TRUE) = (disability_days IS NOT NULL))
  ),
  -- Reposo solo con servicio médico; con días, se indica si es con goce.
  ADD CONSTRAINT occupational_accidents_rest_check CHECK (
    (rest_days IS NULL OR 'servicio_medico' = ANY (care))
    AND ((rest_days IS NULL) = (rest_paid IS NULL))
  ),
  ADD CONSTRAINT occupational_accidents_clinic_check CHECK (
    'clinica_particular' = ANY (care) OR NOT (clinic_requisition OR clinic_payment_closed)
  ),
  ADD CONSTRAINT occupational_accidents_imss_check CHECK (
    'imss' = ANY (care) OR NOT (imss_st7 OR imss_st2)
  );

GRANT UPDATE (severity, disability, disability_days, rest_days, rest_paid,
  clinic_requisition, clinic_payment_closed, imss_st7, imss_st2)
  ON public.occupational_accidents TO authenticated;
