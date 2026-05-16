"use client"

import { useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { login, resendConfirmation } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useTranslation, type TranslationKey } from "@/lib/i18n"

interface FieldErrors {
  email?: string
  password?: string
  form?: string
}

// Maps a server-side error code to (field, translation key).
// `field: "form"` means the message is shown in the top banner instead of
// under a specific input.
const LOGIN_ERROR_MAP: Record<string, { field: keyof FieldErrors; key: TranslationKey }> = {
  invalid_credentials: { field: "password", key: "authErr.invalidCredentials" },
  email_not_confirmed: { field: "email", key: "authErr.emailNotConfirmed" },
  user_not_found: { field: "email", key: "authErr.userNotFound" },
  rate_limit: { field: "form", key: "authErr.rateLimit" },
  unknown: { field: "form", key: "authErr.unknown" },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("errorCode")
  const legacyServerError = searchParams.get("error")
  const messageCode = searchParams.get("message")
  const sessionExpired = searchParams.get("expired") === "1"
  // Post-login redirect target (set by the middleware when a logged-out user
  // tries to open a deep link such as /?openTask=<id> from an email).
  const nextRaw = searchParams.get("next") ?? ""
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : ""
  const { t } = useTranslation()

  // Translate the success message codes (from reset-password and resend flows).
  const serverMessage =
    messageCode === "reset_success" ? t("reset.success")
    : messageCode === "resend_success" ? t("resend.sent")
    : null

  // Resolve a server-side error code into a (field, message) pair so the error
  // is rendered next to the relevant input rather than as a generic banner.
  const serverFieldErrors = useMemo<FieldErrors>(() => {
    if (!errorCode) return {}
    const entry = LOGIN_ERROR_MAP[errorCode] ?? LOGIN_ERROR_MAP.unknown
    return { [entry.field]: t(entry.key) }
  }, [errorCode, t])

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  // Tracked so the "resend confirmation" button can submit it without requiring
  // the user to re-type their email.
  const [emailValue, setEmailValue] = useState("")
  const [resending, setResending] = useState(false)
  // Merge client-side validation errors with server-side ones so both surface
  // simultaneously when the user retries.
  const displayedErrors: FieldErrors = { ...serverFieldErrors, ...errors }
  const showResendButton = errorCode === "email_not_confirmed"

  function validate(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const email = (formData.get("email") as string)?.trim()
    const password = (formData.get("password") as string) ?? ""

    if (!email) {
      errs.email = t("login.emailRequired")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t("login.emailInvalid")
    }

    if (!password) {
      errs.password = t("login.passwordRequired")
    } else if (password.length < 6) {
      errs.password = t("login.passwordMin")
    }

    return errs
  }

  async function handleSubmit(formData: FormData) {
    const errs = validate(formData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    await login(formData)
    setSubmitting(false)
  }

  async function handleResend() {
    if (!emailValue) {
      setErrors((prev) => ({ ...prev, email: t("login.emailRequired") }))
      return
    }
    setResending(true)
    const fd = new FormData()
    fd.set("email", emailValue)
    if (nextPath) fd.set("next", nextPath)
    await resendConfirmation(fd)
    setResending(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionExpired && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              {t("login.sessionExpired")}
            </div>
          )}
          {(displayedErrors.form || legacyServerError) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {displayedErrors.form ?? legacyServerError}
            </div>
          )}
          {serverMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              {serverMessage}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            {nextPath && <input type="hidden" name="next" value={nextPath} />}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                aria-invalid={!!displayedErrors.email}
                className={displayedErrors.email ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
              {displayedErrors.email && <p className="text-xs text-red-400">{displayedErrors.email}</p>}
              {showResendButton && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? <><Loader2 className="size-4 animate-spin" /> {t("resend.sending")}</> : t("resend.button")}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!displayedErrors.password}
                className={displayedErrors.password ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
              {displayedErrors.password && <p className="text-xs text-red-400">{displayedErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> {t("login.signingIn")}</> : t("login.signIn")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <Link href="/signup" className="text-primary underline underline-offset-4 hover:text-primary/80">
              {t("login.signUp")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

