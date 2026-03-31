"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { login } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

interface FieldErrors {
  email?: string
  password?: string
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
  const serverError = searchParams.get("error")
  const serverMessage = searchParams.get("message")

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function validate(formData: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const email = (formData.get("email") as string)?.trim()
    const password = (formData.get("password") as string) ?? ""

    if (!email) {
      errs.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address"
    }

    if (!password) {
      errs.password = "Password is required"
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters"
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

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Planigo</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {serverError}
            </div>
          )}
          {serverMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              {serverMessage}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className={errors.email ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Signing in...</> : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary underline underline-offset-4 hover:text-primary/80">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

