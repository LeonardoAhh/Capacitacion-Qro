"use client"

import PluckedText from "@/components/ui/PluckedText"
import MarkerText from "@/components/ui/MarkerText"
import { LOGIN } from "@/lib/login/presentation"

interface BrandIntroProps {
  titleId: string
  tagline: string
}

export function BrandIntro({ titleId, tagline }: BrandIntroProps) {
  return (
    <>
      <h1 id={titleId} className="text-display-lg text-foreground sm:text-display-2xl">
        <PluckedText text={LOGIN.brandLineOne} loop />
        <PluckedText text={LOGIN.brandLineTwo} loop />
      </h1>
      <p className="mt-4 text-heading-md text-foreground sm:text-heading-lg">
        <MarkerText className="max-w-full whitespace-normal sm:whitespace-nowrap">{tagline}</MarkerText>
      </p>
    </>
  )
}
