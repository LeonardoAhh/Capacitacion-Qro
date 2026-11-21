"use client"

import { LOGIN } from "@/lib/login/presentation"
import { BrandIntro } from "@/components/brand-intro"
import LoginAccessButton from "@/components/login-access-button"

export default function LoginPromoPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <section aria-labelledby="login-intro-title" className="flex min-h-dvh w-full items-center justify-center px-6 py-12 text-center sm:h-full sm:min-h-0">
      <div className="max-w-2xl">
        <BrandIntro titleId="login-intro-title" tagline={LOGIN.tagline} />
        <LoginAccessButton onContinue={onContinue} />
      </div>
    </section>
  )
}
