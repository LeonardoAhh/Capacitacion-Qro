import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface PercentageCriterionCardProps {
  title: string;
  description: string;
  metadataLabel: string;
  metadata: string;
  children: ReactNode;
}

export function PercentageCriterionCard({
  title,
  description,
  metadataLabel,
  metadata,
  children,
}: PercentageCriterionCardProps) {
  return <Card className="@container h-full">
    {/* Compacta: texto a la izquierda y captura a la derecha cuando la tarjeta mide ≥ 28rem; si no, apila. */}
    <fieldset className="grid h-full min-w-0 gap-3 p-(--card-padding) @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center @md:gap-4">
      <legend className="sr-only">{title}</legend>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-label-sm text-foreground">{title}</h3>
          <span className="text-body-sm text-muted-foreground">
            {metadataLabel}: <span className="font-medium text-foreground">{metadata}</span>
          </span>
        </div>
        <p className="text-body-md text-foreground">{description}</p>
      </div>
      {children}
    </fieldset>
  </Card>;
}
