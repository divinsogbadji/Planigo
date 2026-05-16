"use client"

import { useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signup } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Mail, Loader2 } from "lucide-react"
import { useTranslation, type TranslationKey } from "@/lib/i18n"

interface FieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  consent?: string
  consentComms?: string
  form?: string
}

// Maps a server-side error code to (field, translation key) so each Supabase
// error is rendered under the input it concerns instead of a generic banner.
const SIGNUP_ERROR_MAP: Record<string, { field: keyof FieldErrors; key: TranslationKey }> = {
  user_already_exists: { field: "email", key: "authErr.userAlreadyExists" },
  weak_password: { field: "password", key: "authErr.weakPassword" },
  rate_limit: { field: "form", key: "authErr.rateLimit" },
  unknown: { field: "form", key: "authErr.unknown" },
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("errorCode")
  const legacyServerError = searchParams.get("error")
  const successMessage = searchParams.get("success")
  const { t } = useTranslation()

  // Resolve a server-side error code into a (field, message) pair so the error
  // appears next to the relevant input rather than as a generic banner.
  const serverFieldErrors = useMemo<FieldErrors>(() => {
    if (!errorCode) return {}
    const entry = SIGNUP_ERROR_MAP[errorCode] ?? SIGNUP_ERROR_MAP.unknown
    return { [entry.field]: t(entry.key) }
  }, [errorCode, t])

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentCommsChecked, setConsentCommsChecked] = useState(false)
  const displayedErrors: FieldErrors = { ...serverFieldErrors, ...errors }

  function validate(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const firstName = (formData.get("firstName") as string)?.trim()
    const lastName = (formData.get("lastName") as string)?.trim()
    const email = (formData.get("email") as string)?.trim()
    const password = (formData.get("password") as string) ?? ""
    const confirmPassword = (formData.get("confirmPassword") as string) ?? ""

    if (!firstName) errs.firstName = t("signup.firstNameRequired")
    if (!lastName) errs.lastName = t("signup.lastNameRequired")

    if (!email) {
      errs.email = t("login.emailRequired")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t("login.emailInvalid")
    }

    if (!password) {
      errs.password = t("login.passwordRequired")
    } else if (!PASSWORD_REGEX.test(password)) {
      errs.password = t("password.tooWeak")
    }

    if (!confirmPassword) {
      errs.confirmPassword = t("signup.confirmRequired")
    } else if (password !== confirmPassword) {
      errs.confirmPassword = t("signup.passwordMismatch")
    }

    if (!consentChecked) {
      errs.consent = t("signup.consentRequired")
    }

    if (!consentCommsChecked) {
      errs.consentComms = t("signup.consentCommsRequired")
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

          {(displayedErrors.form || legacyServerError) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {displayedErrors.form ?? legacyServerError}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("signup.firstName")}</Label>
                <Input id="firstName" name="firstName" type="text" placeholder="John" aria-invalid={!!displayedErrors.firstName} className={fieldClass(displayedErrors.firstName)} />
                {displayedErrors.firstName && <p className="text-xs text-red-400">{displayedErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("signup.lastName")}</Label>
                <Input id="lastName" name="lastName" type="text" placeholder="Doe" aria-invalid={!!displayedErrors.lastName} className={fieldClass(displayedErrors.lastName)} />
                {displayedErrors.lastName && <p className="text-xs text-red-400">{displayedErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" aria-invalid={!!displayedErrors.email} className={fieldClass(displayedErrors.email)} />
              {displayedErrors.email && <p className="text-xs text-red-400">{displayedErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" aria-invalid={!!displayedErrors.password} className={fieldClass(displayedErrors.password)} />
              {displayedErrors.password && <p className="text-xs text-red-400">{displayedErrors.password}</p>}
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                <li>• {t("password.minLength")}</li>
                <li>• {t("password.uppercase")}</li>
                <li>• {t("password.lowercase")}</li>
                <li>• {t("password.digit")}</li>
                <li>• {t("password.special")}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("signup.confirmPassword")}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" aria-invalid={!!displayedErrors.confirmPassword} className={fieldClass(displayedErrors.confirmPassword)} />
              {displayedErrors.confirmPassword && <p className="text-xs text-red-400">{displayedErrors.confirmPassword}</p>}
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

            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentCommsChecked}
                  onChange={(e) => setConsentCommsChecked(e.target.checked)}
                  className="mt-1 size-4 rounded border-white/20 bg-white/5 accent-purple-500"
                />
                <span className="text-xs text-muted-foreground">
                  {t("signup.consentComms")}
                </span>
              </label>
              {errors.consentComms && <p className="text-xs text-red-400">{errors.consentComms}</p>}
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

