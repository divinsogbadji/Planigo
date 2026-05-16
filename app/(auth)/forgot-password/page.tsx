"use client"

import { useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { requestPasswordReset, verifyResetOtpAndUpdatePassword } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useTranslation, type TranslationKey } from "@/lib/i18n"

interface FieldErrors {
  email?: string
  token?: string
  password?: string
  confirmPassword?: string
  form?: string
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/

const FORGOT_ERROR_MAP: Record<string, { field: keyof FieldErrors; key: TranslationKey }> = {
  invalid_otp: { field: "token", key: "authErr.invalidOtp" },
  token_expired: { field: "token", key: "authErr.tokenExpired" },
  weak_password: { field: "password", key: "authErr.weakPassword" },
  same_password: { field: "password", key: "authErr.samePassword" },
  rate_limit: { field: "form", key: "authErr.rateLimit" },
  unknown: { field: "form", key: "authErr.unknown" },
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <ForgotForm />
    </Suspense>
  )
}

function ForgotForm() {
  const searchParams = useSearchParams()
  // Two-step UI driven by query params so it survives the server-action redirect.
  // Step 1 = enter email. Step 2 (after `?sent=1`) = enter OTP + new password.
  const sent = searchParams.get("sent") === "1"
  const resent = searchParams.get("resent") === "1"
  const initialEmail = searchParams.get("email") ?? ""
  const errorCode = searchParams.get("errorCode")
  const { t } = useTranslation()

  const serverFieldErrors = useMemo<FieldErrors>(() => {
    if (!errorCode) return {}
    const entry = FORGOT_ERROR_MAP[errorCode] ?? FORGOT_ERROR_MAP.unknown
    return { [entry.field]: t(entry.key) }
  }, [errorCode, t])

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const displayedErrors: FieldErrors = { ...serverFieldErrors, ...errors }

  function validateEmail(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const email = (formData.get("email") as string)?.trim()
    if (!email) errs.email = t("login.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t("login.emailInvalid")
    return errs
  }

  function validateReset(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const token = (formData.get("token") as string)?.trim() ?? ""
    const password = (formData.get("password") as string) ?? ""
    const confirmPassword = (formData.get("confirmPassword") as string) ?? ""
    if (!token) errs.token = t("forgot.codeRequired")
    // Supabase OTP length is configurable in the dashboard (6 to 10 digits).
    else if (!/^[0-9]{6,10}$/.test(token)) errs.token = t("forgot.codeInvalid")
    if (!password) errs.password = t("login.passwordRequired")
    else if (!PASSWORD_REGEX.test(password)) errs.password = t("password.tooWeak")
    if (!confirmPassword) errs.confirmPassword = t("signup.confirmRequired")
    else if (password !== confirmPassword) errs.confirmPassword = t("signup.passwordMismatch")
    return errs
  }

  async function handleStep1(formData: FormData) {
    const errs = validateEmail(formData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    await requestPasswordReset(formData)
    setSubmitting(false)
  }

  async function handleStep2(formData: FormData) {
    const errs = validateReset(formData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    await verifyResetOtpAndUpdatePassword(formData)
    setSubmitting(false)
  }

  async function handleResend() {
    const fd = new FormData()
    fd.set("email", initialEmail)
    fd.set("resend", "1")
    setSubmitting(true)
    await requestPasswordReset(fd)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("forgot.title")}</CardTitle>
          <CardDescription>{sent ? t("forgot.sentDesc") : t("forgot.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {displayedErrors.form && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {displayedErrors.form}
            </div>
          )}
          {sent && resent && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              {t("forgot.resentNotice")}
            </div>
          )}

          {sent ? (
            <Step2Form email={initialEmail} errors={displayedErrors} submitting={submitting} onSubmit={handleStep2} onResend={handleResend} />
          ) : (
            <Step1Form initialEmail={initialEmail} errors={displayedErrors} submitting={submitting} onSubmit={handleStep1} />
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/80">
              {t("forgot.backToLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


interface Step1Props {
  initialEmail: string
  errors: FieldErrors
  submitting: boolean
  onSubmit: (formData: FormData) => void | Promise<void>
}

function Step1Form({ initialEmail, errors, submitting, onSubmit }: Step1Props) {
  const { t } = useTranslation()
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("forgot.emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          defaultValue={initialEmail}
          aria-invalid={!!errors.email}
          className={errors.email ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <><Loader2 className="size-4 animate-spin" /> {t("forgot.sending")}</> : t("forgot.submit")}
      </Button>
    </form>
  )
}

interface Step2Props {
  email: string
  errors: FieldErrors
  submitting: boolean
  onSubmit: (formData: FormData) => void | Promise<void>
  onResend: () => void | Promise<void>
}

function Step2Form({ email, errors, submitting, onSubmit, onResend }: Step2Props) {
  const { t } = useTranslation()
  return (
    <form action={onSubmit} className="space-y-4">
      {/* Echo email server-side: it's already in the URL and matches the one the user typed. */}
      <input type="hidden" name="email" value={email} />

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="token">{t("forgot.codeLabel")}</Label>
        <Input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder={t("forgot.codePlaceholder")}
          aria-invalid={!!errors.token}
          className={errors.token ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
        />
        {errors.token && <p className="text-xs text-red-400">{errors.token}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("reset.newPassword")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          className={errors.password ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("reset.confirmPassword")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmPassword}
          className={errors.confirmPassword ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
        />
        {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <><Loader2 className="size-4 animate-spin" /> {t("forgot.verifying")}</> : t("forgot.verifyAndUpdate")}
      </Button>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onResend} disabled={submitting}>
        {t("forgot.resendCode")}
      </Button>
    </form>
  )
}