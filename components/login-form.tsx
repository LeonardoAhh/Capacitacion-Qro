"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { LoginSubmitButton, type LoginSubmitStatus } from "@/components/login-submit-button"
import LoginWelcome from "@/components/login-welcome"
import { LOGIN, loginStyles } from "@/lib/login/presentation"
import { APP_TRANSITION_EXIT_MS, useAppReducedMotion } from "@/components/app-transition"

type LoginErrorField = "email" | "password" | "credentials" | null

function resolveLoginError(err: unknown): string {
  const e = err as { code?: string; message?: string; status?: number } | null
  const message = (e?.message ?? "").toLowerCase()
  if (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  ) {
    return LOGIN.networkError
  }
  if (e?.status === 429 || e?.code === "over_request_rate_limit" || message.includes("rate limit")) {
    return LOGIN.rateLimitError
  }
  return LOGIN.error
}

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<LoginSubmitStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [errorField, setErrorField] = useState<LoginErrorField>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const redirectTimerRef = useRef<number | null>(null)

  const router = useRouter()
  const reducedMotion = useAppReducedMotion()
  const isBusy = submitStatus === "loading" || submitStatus === "success"

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const clearError = () => {
    if (submitStatus === "error") {
      setSubmitStatus("idle")
      setErrorMessage("")
      setErrorField(null)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBusy) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage(LOGIN.requiredFields)
      setErrorField("email")
      setSubmitStatus("error")
      emailRef.current?.focus()
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage(LOGIN.invalidEmail)
      setErrorField("email")
      setSubmitStatus("error")
      emailRef.current?.focus()
      return
    }

    if (!password) {
      setErrorMessage(LOGIN.requiredFields)
      setErrorField("password")
      setSubmitStatus("error")
      passwordRef.current?.focus()
      return
    }

    try {
      setErrorMessage("")
      setErrorField(null)
      setSubmitStatus("loading")
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (authError) throw authError

      setSubmitStatus("success")

      // Wait for card exit transition before routing to role destination.
      redirectTimerRef.current = window.setTimeout(
        () => router.push("/auth/redirect"),
        reducedMotion ? 0 : APP_TRANSITION_EXIT_MS
      )
    } catch (err) {
      setErrorMessage(resolveLoginError(err))
      setErrorField("credentials")
      setSubmitStatus("error")
      passwordRef.current?.focus()
    }
  }

  const isEmailInvalid = submitStatus === "error" && (errorField === "email" || errorField === "credentials")
  const isPasswordInvalid = submitStatus === "error" && (errorField === "password" || errorField === "credentials")

  return (
    <div className={loginStyles.form}>
      <LoginWelcome />
      <form
        onSubmit={handleLogin}
        data-status={submitStatus}
        className={`${loginStyles.fields} login-autofill`}
        noValidate
        aria-labelledby="login-title"
        aria-describedby="login-description"
      >
        <div className={loginStyles.field}>
          <Label htmlFor="email">{LOGIN.email}</Label>
          <Input
            ref={emailRef}
            id="email"
            autoFocus
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isBusy}
            aria-required="true"
            aria-invalid={isEmailInvalid}
            aria-describedby={submitStatus === "error" ? "login-error" : undefined}
            placeholder={LOGIN.emailPlaceholder}
            enterKeyHint="next"
            className={loginStyles.input}
            value={email}
            onChange={event => {
              setEmail(event.target.value)
              clearError()
            }}
            data-testid="login-email-input"
          />
        </div>

        <div className={loginStyles.field}>
          <Label htmlFor="password">{LOGIN.password}</Label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={isBusy}
              aria-required="true"
              aria-invalid={isPasswordInvalid}
              aria-describedby={submitStatus === "error" ? "login-error" : undefined}
              placeholder={LOGIN.passwordPlaceholder}
              enterKeyHint="go"
              value={password}
              onChange={event => {
                setPassword(event.target.value)
                clearError()
              }}
              className={loginStyles.passwordInput}
              data-testid="login-password-input"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isBusy}
              className={loginStyles.passwordToggle}
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? LOGIN.hidePassword : LOGIN.showPassword}
              aria-controls="password"
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {submitStatus === "error" && (
          <Alert variant="destructive" id="login-error" className="bg-destructive/10">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <LoginSubmitButton status={submitStatus} data-testid="login-submit">
          {LOGIN.submit}
        </LoginSubmitButton>
        <p role="status" className="sr-only">
          {submitStatus === "loading" ? LOGIN.submitting : submitStatus === "success" ? LOGIN.success : ""}
        </p>
      </form>
    </div>
  )
}
