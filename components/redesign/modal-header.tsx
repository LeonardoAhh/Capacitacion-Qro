import React from "react"

export interface RedesignModalHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  onClose?: () => void
}

export function RedesignModalHeader({ title, subtitle, icon }: RedesignModalHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-2 sm:px-6">
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {icon && <div className="text-muted-foreground flex shrink-0">{icon}</div>}
        <div className="flex flex-col min-w-0">
          <h2 className="truncate text-heading-md text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-body-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
