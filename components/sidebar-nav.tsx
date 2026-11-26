"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LinkPendingIcon } from "@/components/ui/link-pending-icon"
import {
  SIDEBAR_GROUP_TRIGGER,
  SIDEBAR_ICON,
  SIDEBAR_ICON_BOX,
  SIDEBAR_ROW,
  SIDEBAR_ROW_ACTIVE,
  SIDEBAR_ROW_BASE,
  SIDEBAR_ROW_IDLE,
} from "@/components/sidebar-density"
import { cn } from "@/lib/utils"
import { findActiveLeaf, getWorkspaceNavSections, type NavLeaf, type WorkspaceId } from "@/lib/navigation"
import { useClosedNavGroups } from "@/lib/hooks/useClosedNavGroups"
import { useRole } from "@/lib/hooks/useRole"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"

const tileBase = "min-h-14 gap-3 rounded-md px-3 py-2 text-body-md"
const tileIdle = "border-sidebar-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"

interface VisibleSection {
  label: string
  collapsible: boolean
  items: NavLeaf[]
}

function NavLink({
  leaf,
  active,
  mobile,
  onNavigate,
}: {
  leaf: NavLeaf
  active: boolean
  mobile: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()

  return (
    <Link
      href={leaf.href}
      // Con una captura sin guardar se confirma antes de salir; el menú móvil
      // solo se cierra si de verdad se navega.
      onNavigate={(event) => {
        if (!hasUnsavedChanges()) return onNavigate?.()
        event.preventDefault()
        void confirmUnsavedChanges().then((confirmed) => {
          if (!confirmed) return
          onNavigate?.()
          router.push(leaf.href)
        })
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        SIDEBAR_ROW_BASE,
        mobile ? tileBase : SIDEBAR_ROW,
        active ? SIDEBAR_ROW_ACTIVE : mobile ? tileIdle : SIDEBAR_ROW_IDLE,
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-md",
          SIDEBAR_ICON_BOX,
          active ? "text-sidebar-primary" : "text-muted-foreground",
        )}
      >
        {/* Si la página tarda, el ícono pasa a spinner: el clic sí entró. */}
        <LinkPendingIcon icon={leaf.icon} className={SIDEBAR_ICON} />
      </span>
      <span className={mobile ? "line-clamp-2 min-w-0 break-words" : "truncate"}>{leaf.label}</span>
    </Link>
  )
}

function NavList({
  items,
  activeHref,
  mobile,
  onNavigate,
}: {
  items: NavLeaf[]
  activeHref: string | undefined
  mobile: boolean
  onNavigate?: () => void
}) {
  return (
    <ul className={mobile ? "grid grid-cols-2 gap-2" : undefined}>
      {items.map((leaf) => (
        <li key={leaf.href}>
          <NavLink leaf={leaf} active={leaf.href === activeHref} mobile={mobile} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Navegación compartida por el panel de escritorio y el menú móvil: rutas sueltas
 * arriba y después los grupos colapsables, en el orden de lib/navigation; las rutas
 * de cada grupo van en orden alfabético.
 * Cada rol ve solo las rutas que puede abrir.
 */
export function SidebarNav({
  pathname,
  onNavigate,
  mobile = false,
  workspace,
}: {
  pathname: string
  /** Al elegir una ruta en el menú móvil: lo cierra. */
  onNavigate?: () => void
  mobile?: boolean
  workspace: WorkspaceId
}) {
  const { canAccess } = useRole()

  const { flat, groups, activeHref, activeGroup } = useMemo(() => {
    const sections: VisibleSection[] = getWorkspaceNavSections(workspace)
      .map((section) => {
        const items = section.items.filter((leaf) => canAccess(leaf.href))
        return {
          label: section.label,
          collapsible: section.collapsible === true,
          // Dentro de un grupo, alfabético; las rutas sueltas conservan su orden.
          items: section.collapsible
            ? items.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))
            : items,
        }
      })
      .filter((section) => section.items.length > 0)
    const active = findActiveLeaf(sections.flatMap((section) => section.items), pathname)
    return {
      flat: sections.filter((section) => !section.collapsible).flatMap((section) => section.items),
      groups: sections.filter((section) => section.collapsible),
      activeHref: active?.href,
      activeGroup: active && sections.find((section) => section.collapsible && section.items.includes(active))?.label,
    }
  }, [workspace, canAccess, pathname])

  const [closed, setClosed] = useClosedNavGroups(activeGroup)
  const groupLabels = groups.map((group) => group.label)

  return (
    <nav
      aria-label="Secciones"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-3 pb-2 scrollbar-thin"
    >
      {flat.length > 0 && (
        <NavList items={flat} activeHref={activeHref} mobile={mobile} onNavigate={onNavigate} />
      )}
      {groups.length > 0 && (
        <Accordion
          type="multiple"
          value={groupLabels.filter((label) => !closed.includes(label))}
          // Conserva los cerrados del otro espacio de trabajo.
          onValueChange={(open) => setClosed((current) => [
            ...current.filter((label) => !groupLabels.includes(label)),
            ...groupLabels.filter((label) => !open.includes(label)),
          ])}
          className="flex flex-col gap-1"
        >
          {groups.map((group) => (
            <AccordionItem key={group.label} value={group.label} className="border-0">
              <AccordionTrigger
                className={cn(
                  SIDEBAR_GROUP_TRIGGER,
                  "rounded-md py-0 text-muted-foreground hover:text-foreground hover:no-underline focus-visible:outline-sidebar-ring",
                )}
              >
                {group.label}
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <NavList items={group.items} activeHref={activeHref} mobile={mobile} onNavigate={onNavigate} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </nav>
  )
}
