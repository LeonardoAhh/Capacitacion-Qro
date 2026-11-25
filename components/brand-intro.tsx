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
      <h1 id={titleId} className="text-heading-lg text-foreground sm:text-display-xl md:text-display-2xl">
        <PluckedText text={LOGIN.brandLineOne} />
        <PluckedText text={LOGIN.brandLineTwo} />
      </h1>
      <p className="mt-4 text-balance text-heading-md text-foreground sm:text-heading-lg md:text-heading-xl">
        <MarkerText className="max-w-full whitespace-normal lg:whitespace-nowrap">{tagline}</MarkerText>
      </p>
    </>
  )
}
