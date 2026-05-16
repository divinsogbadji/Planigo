"use client"

import { useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { updatePassword } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useTranslation, type TranslationKey } from "@/lib/i18n"

interface FieldErrors {
  password?: string
  confirmPassword?: string
  form?: string
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/

const RESET_ERROR_MAP: Record<string, { field: keyof FieldErrors; key: TranslationKey }> = {
  weak_password: { field: "password", key: "authErr.weakPassword" },
  same_password: { field: "password", key: "authErr.samePassword" },
  session_missing: { field: "form", key: "authErr.sessionMissing" },
  rate_limit: { field: "form", key: "authErr.rateLimit" },
  unknown: { field: "form", key: "authErr.unknown" },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("errorCode")
  const invalidLink = searchParams.get("invalid") === "1"
  const { t } = useTranslation()

  const serverFieldErrors = useMemo<FieldErrors>(() => {
    if (!errorCode) return {}
    const entry = RESET_ERROR_MAP[errorCode] ?? RESET_ERROR_MAP.unknown
    return { [entry.field]: t(entry.key) }
  }, [errorCode, t])

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const displayedErrors: FieldErrors = { ...serverFieldErrors, ...errors }

  function validate(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const password = (formData.get("password") as string) ?? ""
    const confirmPassword = (formData.get("confirmPassword") as string) ?? ""
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
    return errs
  }

  async function handleSubmit(formData: FormData) {
    const errs = validate(formData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    await updatePassword(formData)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("reset.title")}</CardTitle>
          <CardDescription>{t("reset.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {t("reset.invalidLink")}
            </div>
          )}
          {displayedErrors.form && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {displayedErrors.form}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("reset.newPassword")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!displayedErrors.password}
                className={displayedErrors.password ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
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
              <Label htmlFor="confirmPassword">{t("reset.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!displayedErrors.confirmPassword}
                className={displayedErrors.confirmPassword ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
              {displayedErrors.confirmPassword && <p className="text-xs text-red-400">{displayedErrors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> {t("reset.updating")}</> : t("reset.submit")}
            </Button>
          </form>

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
