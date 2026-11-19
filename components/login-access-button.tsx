"use client"

import { useState } from "react"
import { ArrowRight, BookOpen } from "lucide"
import { motion } from "framer-motion"
import { MorphIcon } from "morphicons/react"
import { useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"

interface LoginAccessButtonProps {
  onContinue: () => void
}

export default function LoginAccessButton({ onContinue }: LoginAccessButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const reducedMotion = useAppReducedMotion()
  const isActive = isHovered || isFocused

  return (
    <Button asChild className="mt-8 min-w-40 justify-between gap-4 px-5">
      <motion.button
        type="button"
        onClick={onContinue}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        whileHover={reducedMotion ? undefined : { y: -2 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
      >
        <span>Acceder</span>
        <motion.span
          aria-hidden="true"
          className="flex size-7 items-center justify-center"
          animate={{ x: isActive && !reducedMotion ? 2 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        >
          <MorphIcon
            icon={isActive ? ArrowRight : BookOpen}
            size={16}
            strokeWidth={2}
            spring="snappy"
            reducedMotion={reducedMotion ? "always" : "user"}
          />
        </motion.span>
      </motion.button>
    </Button>
  )
}
