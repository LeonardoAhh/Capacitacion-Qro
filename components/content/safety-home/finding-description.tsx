"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FindingDescriptionProps {
  title: string
  description: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function FindingDescription({ title, description, isOpen, onOpenChange }: FindingDescriptionProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Descripción completa del hallazgo</DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap break-words text-body-lg text-foreground">{description}</p>
      </DialogContent>
    </Dialog>
  )
}
