"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signup } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Mail, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface FieldErrors {
  email?: string
  password?: string
  confirmPassword?: string
  consent?: string
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const serverError = searchParams.get("error")
  const successMessage = searchParams.get("success")
  const { t } = useTranslation()

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  function validate(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const email = (formData.get("email") as string)?.trim()
    const password = (formData.get("password") as string) ?? ""
    const confirmPassword = (formData.get("confirmPassword") as string) ?? ""

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

    if (!confirmPassword) {
      errs.confirmPassword = t("signup.confirmRequired")
    } else if (password !== confirmPassword) {
      errs.confirmPassword = t("signup.passwordMismatch")
    }

    if (!consentChecked) {
      errs.consent = t("signup.consentRequired")
    }

    return errs
  }

  async function handleSubmit(formData: FormData) {
    const errs = validate(formData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    await signup(formData)
    setSubmitting(false)
  }

  const fieldClass = (err?: string) =>
    err ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
          <CardDescription>{t("signup.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="mb-4 space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                {t("signup.accountCreated")}
              </div>
              <div className="flex items-start gap-2 text-sm text-emerald-300/80">
                <Mail className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{t("signup.emailSent")}</p>
                  <p className="mt-1 text-xs text-emerald-300/60">{t("signup.checkSpam")}</p>
                </div>
              </div>
              <Link href="/login">
                <Button variant="outline" size="sm" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  {t("signup.goToSignIn")}
                </Button>
              </Link>
            </div>
          )}

          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {serverError}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" aria-invalid={!!errors.email} className={fieldClass(errors.email)} />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" aria-invalid={!!errors.password} className={fieldClass(errors.password)} />
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("signup.confirmPassword")}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" aria-invalid={!!errors.confirmPassword} className={fieldClass(errors.confirmPassword)} />
              {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 size-4 rounded border-white/20 bg-white/5 accent-purple-500"
                />
                <span className="text-xs text-muted-foreground">
                  {t("signup.consent")}{" "}
                  <Link href="/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank">
                    {t("signup.privacyPolicy")}
                  </Link>{" "}
                  {t("signup.consentSuffix")}
                </span>
              </label>
              {errors.consent && <p className="text-xs text-red-400">{errors.consent}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> {t("signup.creatingAccount")}</> : t("signup.signUp")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("signup.hasAccount")}{" "}
            <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/80">
              {t("signup.signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

