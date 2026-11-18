import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared horizontal frame for every authenticated workspace surface.
 * Keeping header and page content on the same grid prevents routes from
 * inventing their own gutters or stretching beyond a readable line length.
 */
interface WorkspaceContainerProps extends HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean
}

export function WorkspaceContainer({ className, fullWidth = false, ...props }: WorkspaceContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        fullWidth ? "max-w-none" : "max-w-[var(--workspace-max-width)]",
        className,
      )}
      {...props}
    />
  )
}
