"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FindingDescriptionProps {
  title: string
  description: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTruncatedChange: (truncated: boolean) => void
}

export function FindingDescription({ title, description, isOpen, onOpenChange, onTruncatedChange }: FindingDescriptionProps) {
  const previewRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return
    const measure = () => onTruncatedChange(preview.scrollHeight > preview.clientHeight + 1)
    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(preview)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [description, onTruncatedChange])

  return (
    <>
      <p ref={previewRef} className="mt-2 line-clamp-3 shrink-0 text-body-md text-muted-foreground">
        {description}
      </p>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <p className="whitespace-pre-wrap text-body-md text-foreground">{description}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
