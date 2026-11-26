import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-body-lg text-foreground transition-colors placeholder:text-muted-foreground read-only:bg-muted read-only:text-muted-foreground aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-body-md",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
