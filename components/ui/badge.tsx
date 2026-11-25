import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
        outline: "text-foreground",
        success:
          "border-chart-1/30 bg-chart-1/15 text-chart-1-deep hover:bg-chart-1/20",
        warning:
          "border-warning/30 bg-warning/10 text-warning-deep hover:bg-warning/15",
        info:
          "border-info/20 bg-info/10 text-info hover:bg-info/15",
        error:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
      },
      size: {
        default: "px-2.5 py-0.5 text-body-sm",
        sm: "px-2 py-0.5 text-body-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
