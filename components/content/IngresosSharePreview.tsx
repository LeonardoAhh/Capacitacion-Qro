"use client"

import { Check, Copy, Download, MessageSquareShare, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WA_CHAR_LIMIT, type ShareFormat } from "@/lib/ingresos/share-messages"
import { cn } from "@/lib/utils"

const NUMERO = new Intl.NumberFormat("es-MX")

// El HTML del correo no trae estilos: aquí se le da la jerarquía del sistema.
const EMAIL_PREVIEW = cn(
  "grid gap-3 text-body-md text-foreground",
  "[&_h3]:mt-2 [&_h3]:text-eyebrow [&_h3]:uppercase [&_h3]:text-muted-foreground",
  "[&_ul_ul]:mt-0.5 [&_ul_ul]:text-body-sm [&_ul_ul]:text-muted-foreground [&>ul>li]:py-1.5",
  "[&_strong]:font-medium [&_em]:not-italic [&_em]:text-muted-foreground",
)

interface IngresosSharePreviewProps {
  loading: boolean
  format: ShareFormat
  text: string
  html: string
  employeeCount: number
  vencidasCount: number
  copied: boolean
  onCopy: () => void
  onSend: () => void
  onDownload: () => void
}

/** Resultado: el mensaje tal como se enviará, con sus datos clave y las acciones. */
export function IngresosSharePreview({
  loading, format, text, html, employeeCount, vencidasCount, copied, onCopy, onSend, onDownload,
}: IngresosSharePreviewProps) {
  const isWhatsApp = format === "whatsapp"
  const overLimit = isWhatsApp && text.length > WA_CHAR_LIMIT
  const disabled = loading || employeeCount === 0
  const CopyIcon = copied ? Check : Copy

  return (
    <section aria-labelledby="share-preview-title" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:absolute lg:inset-0">
      <header className="flex min-h-(--control-height) flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-1 pl-4 pr-1">
        <h2 id="share-preview-title" className="text-eyebrow uppercase text-muted-foreground">Vista previa</h2>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" size="sm" aria-label={`${employeeCount} empleados`}>
            <Users className="size-3" aria-hidden="true" />{employeeCount}
          </Badge>
          {vencidasCount > 0 && (
            <Badge variant="destructive" size="sm">{vencidasCount} {vencidasCount === 1 ? "vencida" : "vencidas"}</Badge>
          )}
        </div>
        <Button type="button" variant="ghost" size="xs" className="ml-auto px-1 text-muted-foreground"
          onClick={onDownload} disabled={disabled} aria-label="Descargar como .txt" title="Descargar como .txt">
          <Download aria-hidden="true" />
        </Button>
      </header>

      {/* El mensaje se desplaza aquí y las acciones quedan a la vista; en escritorio toma el alto del formulario. */}
      <div role="region" aria-label="Mensaje generado" tabIndex={0}
        className="max-h-[70dvh] min-h-64 flex-1 overflow-y-auto p-4 scrollbar-thin lg:max-h-none lg:min-h-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring">
        {loading ? (
          <div role="status" aria-label="Cargando pendientes" className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isWhatsApp ? (
          <p className="whitespace-pre-wrap break-words text-body-md text-foreground">{text}</p>
        ) : (
          // HTML generado con todos los textos escapados (share-messages).
          <div className={EMAIL_PREVIEW} dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        {isWhatsApp && (
          <span className={cn("text-body-sm tabular-nums", overLimit ? "font-medium text-destructive" : "text-muted-foreground")}>
            {NUMERO.format(text.length)} / {NUMERO.format(WA_CHAR_LIMIT)}
            <span className="sr-only"> caracteres{overLimit ? ", excede el límite de WhatsApp" : ""}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isWhatsApp && (
            <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={disabled}>
              <CopyIcon aria-hidden="true" />{copied ? "Copiado" : "Copiar"}
            </Button>
          )}
          <Button type="button" size="sm" onClick={isWhatsApp ? onSend : onCopy} disabled={disabled || overLimit}>
            {isWhatsApp ? <MessageSquareShare aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {isWhatsApp ? "Enviar por WhatsApp" : copied ? "Copiado" : "Copiar para correo"}
          </Button>
        </div>
      </footer>
    </section>
  )
}
