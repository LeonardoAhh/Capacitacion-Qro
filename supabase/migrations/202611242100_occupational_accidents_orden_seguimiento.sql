-- Occupational Health: los pasos de seguimiento van en orden. La ST2 (alta médica)
-- llega después de la ST7 y el pago se cierra después de la requisición; así los
-- contadores de pendientes siempre cuadran.

-- Registros previos: si ya hay ST2 o pago cerrado, el paso anterior se dio.
UPDATE public.occupational_accidents SET imss_st7 = true WHERE imss_st2 AND NOT imss_st7;
UPDATE public.occupational_accidents SET clinic_requisition = true WHERE clinic_payment_closed AND NOT clinic_requisition;

ALTER TABLE public.occupational_accidents
  DROP CONSTRAINT IF EXISTS occupational_accidents_imss_order_check,
  DROP CONSTRAINT IF EXISTS occupational_accidents_clinic_order_check;

ALTER TABLE public.occupational_accidents
  ADD CONSTRAINT occupational_accidents_imss_order_check CHECK (imss_st7 OR NOT imss_st2),
  ADD CONSTRAINT occupational_accidents_clinic_order_check CHECK (clinic_requisition OR NOT clinic_payment_closed);
