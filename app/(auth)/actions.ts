"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

// Maps a raw Supabase AuthError to a stable code consumed by the client to
// pick a translated, field-level message. We rely on `error.code` first
// (modern Supabase JS) and fall back to lowercase substring matching on the
// message for older shapes.
function toAuthErrorCode(error: { code?: string | null; message?: string | null }): string {
  const code = (error.code ?? "").toLowerCase()
  const msg = (error.message ?? "").toLowerCase()
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "invalid_credentials"
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "email_not_confirmed"
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered") || msg.includes("user already")) return "user_already_exists"
  if (code === "weak_password" || msg.includes("password should be") || msg.includes("weak password")) return "weak_password"
  if (code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many requests")) return "rate_limit"
  if (code === "user_not_found" || msg.includes("user not found")) return "user_not_found"
  if (code === "auth_session_missing" || msg.includes("auth session missing")) return "session_missing"
  if (code === "same_password" || msg.includes("new password should be different")) return "same_password"
  if (code === "otp_expired" || msg.includes("token has expired") || msg.includes("otp expired")) return "token_expired"
  if (code === "otp_disabled" || code === "invalid_otp" || msg.includes("invalid otp") || msg.includes("token") && msg.includes("invalid")) return "invalid_otp"
  return "unknown"
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  // Optional post-login destination (forwarded from the login form when arriving
  // from an email deep-link). Restricted to relative paths to prevent open redirects.
  const nextRaw = (formData.get("next") as string | null)?.trim() ?? ""
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/"

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const params = new URLSearchParams({ errorCode: toAuthErrorCode(error) })
    if (nextPath !== "/") params.set("next", nextPath)
    redirect("/login?" + params.toString())
  }

  revalidatePath("/", "layout")
  redirect(nextPath)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development"

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = (formData.get("firstName") as string)?.trim() ?? ""
  const lastName = (formData.get("lastName") as string)?.trim() ?? ""

  const { error, data: signUpData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(isDev ? { emailRedirectTo: undefined } : {}),
      data: {
        first_name: firstName,
        last_name: lastName,
        notifications: true,
        auto_archive: false,
      },
    },
  })

  if (error) {
    redirect("/signup?errorCode=" + toAuthErrorCode(error))
  }

  // Send welcome email (fire & forget — don't block signup on email failure)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    fetch(`${baseUrl}/api/welcome-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {}) // silently ignore
  } catch {
    // ignore welcome email errors
  }

  // In dev mode, if session is returned (email confirmation disabled in Supabase),
  // redirect straight to dashboard
  if (isDev && signUpData?.session) {
    revalidatePath("/", "layout")
    redirect("/")
  }

  revalidatePath("/", "layout")
  redirect("/signup?success=" + encodeURIComponent("Account created! Please check your inbox (and spam folder) to confirm your email before signing in."))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

// Builds the absolute base URL used by Supabase to deep-link the user back into
// our app after clicking the reset link in the email. Mirrors the welcome-email
// fallback chain: explicit override → Vercel deploy URL → request origin → localhost.
async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  try {
    const h = await headers()
    const host = h.get("host")
    const proto = h.get("x-forwarded-proto") ?? "https"
    if (host) return `${proto}://${host}`
  } catch {
    // headers() outside request scope — ignore
  }
  return "http://localhost:3000"
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? ""
  // `resent=1` distinguishes a manual re-trigger so the UI can flash a notice
  // without losing the OTP form state.
  const isResend = formData.get("resend") === "1"
  if (!email) {
    redirect("/forgot-password?errorCode=invalid_credentials")
  }

  const supabase = await createClient()
  const baseUrl = await getBaseUrl()

  // The recovery email sent by Supabase contains both:
  //   - a 6-digit token (`{{ .Token }}`) used by the OTP flow on /forgot-password
  //   - a magic link (`{{ .ConfirmationURL }}`) that goes through /auth/callback
  //     and falls back to the /reset-password page (legacy flow).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
  })

  // Always show the same success state regardless of whether the email exists,
  // to avoid leaking account existence (account enumeration). The email is echoed
  // in the URL so the second step (OTP) can pre-fill the hidden field; this is
  // the same email the user just typed so there is no information leak.
  const params = new URLSearchParams({ sent: "1", email })
  if (isResend) params.set("resent", "1")
  redirect("/forgot-password?" + params.toString())
}

export async function verifyResetOtpAndUpdatePassword(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? ""
  const token = (formData.get("token") as string)?.trim() ?? ""
  const password = (formData.get("password") as string) ?? ""

  const baseParams = new URLSearchParams({ sent: "1", email })

  const supabase = await createClient()

  // Step 1: exchange the OTP for a recovery session.
  const { error: verifyErr } = await supabase.auth.verifyOtp({ email, token, type: "recovery" })
  if (verifyErr) {
    baseParams.set("errorCode", toAuthErrorCode(verifyErr))
    redirect("/forgot-password?" + baseParams.toString())
  }

  // Step 2: now in a recovery session, set the new password.
  const { error: updateErr } = await supabase.auth.updateUser({ password })
  if (updateErr) {
    baseParams.set("errorCode", toAuthErrorCode(updateErr))
    redirect("/forgot-password?" + baseParams.toString())
  }

  // Sign the user out so they have to re-authenticate with the new password.
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login?message=reset_success")
}

export async function updatePassword(formData: FormData) {
  const password = (formData.get("password") as string) ?? ""

  const supabase = await createClient()
  // Requires an active recovery session — established by /auth/callback after
  // exchanging the recovery code from the email link (magic-link fallback flow).
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect("/reset-password?errorCode=" + toAuthErrorCode(error))
  }

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login?message=reset_success")
}

export async function resendConfirmation(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? ""
  const nextRaw = (formData.get("next") as string | null)?.trim() ?? ""
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : ""

  if (!email) {
    const params = new URLSearchParams({ errorCode: "invalid_credentials" })
    if (nextPath) params.set("next", nextPath)
    redirect("/login?" + params.toString())
  }

  const supabase = await createClient()
  const baseUrl = await getBaseUrl()

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${baseUrl}/auth/callback` },
  })

  const params = new URLSearchParams()
  if (nextPath) params.set("next", nextPath)
  if (error) {
    params.set("errorCode", toAuthErrorCode(error))
  } else {
    params.set("message", "resend_success")
  }
  redirect("/login?" + params.toString())
}

