import * as React from "react"

import { cn } from "@/lib/utils"

// text-body-lg en móvil evita el zoom automático de iOS; body-md desde md.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-(--control-height) w-full rounded-md border border-input bg-card px-3 py-2 text-body-lg text-foreground file:border-0 file:bg-transparent file:text-body-md file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-body-md",
          type === "date" && "appearance-none leading-tight py-0",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
