"use client"

import { LOGIN, loginStyles } from "@/lib/login/presentation"
import { BrandIntro } from "@/components/brand-intro"
import LoginAccessButton from "@/components/login-access-button"

export default function LoginPromoPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <section aria-labelledby="login-intro-title" className={loginStyles.promoRegion}>
      <div className="max-w-2xl">
        <BrandIntro titleId="login-intro-title" tagline={LOGIN.tagline} />
        <LoginAccessButton onContinue={onContinue} />
      </div>
    </section>
  )
}
