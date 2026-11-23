"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EvaluationTutorial } from "./desempeno/evaluation-tutorial";
import { useEvaluationReducedMotion } from "./desempeno/use-evaluation-motion";
import { cn } from "@/lib/utils";

interface DesempenoGuiaProps {
  open: boolean;
  onClose: () => void;
}

/** Práctica de evaluación con datos ficticios. Se abre a petición (Guía o aviso de práctica) y se cierra con Escape o ✕. */
export function DesempenoGuia({ open, onClose }: DesempenoGuiaProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useEvaluationReducedMotion();

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose(); }}>
      <DialogContent
        raw
        className={cn("overflow-hidden sm:max-h-[90dvh] sm:max-w-3xl", reducedMotion && "!animate-none")}
        // Un clic fuera no descarta el avance de la práctica; Escape y ✕ sí cierran.
        onPointerDownOutside={event => event.preventDefault()}
        onOpenAutoFocus={event => {
          event.preventDefault();
          previousFocusRef.current = document.activeElement as HTMLElement | null;
          titleRef.current?.focus();
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          previousFocusRef.current?.focus();
        }}
      >
        <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
          <DialogTitle ref={titleRef} tabIndex={-1} className="min-w-0 flex-1 text-label-sm outline-none">
            Práctica de evaluación
          </DialogTitle>
          <DialogDescription className="sr-only">
            Practica cada sección de una evaluación con datos ficticios. Ningún dato se guarda.
          </DialogDescription>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Salir de la práctica">
            <X aria-hidden="true" />
          </Button>
        </header>
        <EvaluationTutorial onFinish={onClose} />
      </DialogContent>
    </Dialog>
  );
}
