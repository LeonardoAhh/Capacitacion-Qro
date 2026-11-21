import type { CSSProperties, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  ratio: number
}

export function AspectRatio({
  ratio,
  className,
  style,
  ...props
}: AspectRatioProps) {
  const aspectRatioStyle: CSSProperties = {
    aspectRatio: String(ratio),
    ...style,
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={aspectRatioStyle}
      {...props}
    />
  )
}
