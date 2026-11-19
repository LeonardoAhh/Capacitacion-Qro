"use client"

import { APP_NAME, BRAND_NAME } from "@/lib/constants/company"
import PluckedText from "@/components/ui/PluckedText"
import MarkerText from "@/components/ui/MarkerText"
import LoginAccessButton from "@/components/login-access-button"

export default function LoginPromoPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <section aria-labelledby="login-intro-title" className="flex min-h-dvh w-full items-center justify-center px-6 py-12 text-center sm:h-full sm:min-h-0">
      <div className="max-w-2xl">
        <h1 id="login-intro-title" className="text-display-lg text-foreground sm:text-display-2xl">
          <PluckedText text={APP_NAME} loop />
          <PluckedText text={BRAND_NAME} loop />
        </h1>
        <p className="mt-4 text-heading-md text-foreground sm:text-heading-lg">
          <MarkerText>Aprender te hace crecer.</MarkerText>
        </p>
        <LoginAccessButton onContinue={onContinue} />
      </div>
    </section>
  )
}
