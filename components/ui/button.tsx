import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Tamaños visuales menores a 44px añaden `touch-target` (globals.css) para
// conservar el área táctil mínima sin padding vertical (AGENTS.md §3.3, §6).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ui-hover-primary",
        destructive:
          "bg-destructive text-destructive-foreground ui-hover-destructive",
        outline:
          "border border-border bg-card hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground ui-hover-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      shape: {
        pill: "rounded-marketing",
        square: "rounded-md",
      },
      size: {
        default: "h-(--control-height) px-4 text-sm",
        xs: "relative touch-target h-7 rounded-md px-2 text-xs",
        sm: "relative touch-target h-(--control-height-sm) rounded-md px-3 text-sm",
        lg: "h-(--control-height) rounded-md px-8 text-base",
        icon: "size-(--control-height)",
        marketing: "h-11 px-[14px] text-base",
        nav: "relative touch-target h-9 px-[6px] text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "square",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, shape, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, shape, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
