"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface MarkerTextProps {
  children: string
  className?: string
}

/** The single highlight treatment used on the login tagline. */
export default function MarkerText({ children, className }: MarkerTextProps) {
  const maskId = useId().replace(/:/g, "")
  const rootRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let isInView = false
    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting
      setIsVisible(isInView && document.visibilityState === "visible")
    })
    const onVisibility = () => setIsVisible(isInView && document.visibilityState === "visible")
    observer.observe(root)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <mark ref={rootRef} className={cn("relative inline-block whitespace-nowrap bg-transparent text-inherit", className)}>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-accent"
        preserveAspectRatio="none"
        viewBox="0 0 100 20"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="20">
            <path
              className="login-marker-stroke"
              data-visible={isVisible}
              d="M0 10 L100 10"
              fill="none"
              pathLength="100"
              stroke="white"
              strokeWidth="20"
              strokeDasharray="100"
            />
          </mask>
        </defs>
        <path
          d="M0 2 C18 0 29 4 50 2 S82 4 100 1 L100 19 C79 17 68 20 50 18 S17 20 0 17 Z"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
      </svg>
      <span className="relative">{children}</span>
    </mark>
  )
}
