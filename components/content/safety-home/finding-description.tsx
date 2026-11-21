"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FindingDescriptionProps {
  title: string
  description: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/** Detalle completo del hallazgo; la tarjeta solo muestra el enlace "Ver hallazgo". */
export function FindingDescription({ title, description, isOpen, onOpenChange }: FindingDescriptionProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="whitespace-pre-wrap text-body-md text-foreground">{description}</p>
      </DialogContent>
    </Dialog>
  )
}
