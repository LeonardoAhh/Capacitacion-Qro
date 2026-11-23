"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const HEAD = "whitespace-nowrap text-eyebrow uppercase";

export interface PendingColumn {
  label: string;
  /** Ancho y visibilidad por breakpoint (p. ej. "hidden w-40 sm:table-cell"). */
  className?: string;
}

/** Tabla de "Por evaluar": mismo marco, encabezado y densidad en Nuevo ingreso y Semestrales. */
export function PendingTable({ caption, columns, children }: { caption: string; columns: PendingColumn[]; children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">
    <Table className="table-fixed">
      <caption className="sr-only">{caption}</caption>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          {columns.map(({ label, className }) => <TableHead key={label} scope="col" className={cn(HEAD, className)}>{label}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  </div>;
}

/** Nombre arriba y detalle abajo, en una línea cada uno. */
export function PendingName({ name, detail }: { name: string; detail: string }) {
  return <>
    <span className="block truncate text-label-sm text-foreground">{name}</span>
    <span className="block truncate text-body-sm text-muted-foreground">{detail}</span>
  </>;
}
