import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Uses the application's rem spacing, density, font scale and semantic colors. */
export const evaluationStyles = {
  page: "w-full min-w-0 space-y-6 dense:space-y-4",
  stack: "space-y-4",
  sectionTitle: "text-heading-md text-foreground",
  description: "text-body-md text-muted-foreground",
  fieldLabel: "text-label-sm text-muted-foreground",
  caption: "text-body-sm text-muted-foreground",
  tableNumber: "w-28 tabular-nums",
  summary: "mt-4 flex flex-wrap justify-between gap-3 border-t pt-4 text-label-sm"
} as const;
export function SectionTitle({
  className,
  ...props
}: ComponentProps<"h2">) {
  return <h2 className={cn(evaluationStyles.sectionTitle, className)} {...props} />;
}
export function FieldValue({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return <dl className="min-w-0 space-y-1"><dt className={evaluationStyles.fieldLabel}>{label}</dt><dd className="break-words text-body-lg text-foreground">{children}</dd></dl>;
}
