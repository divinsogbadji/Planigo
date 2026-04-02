"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message))
  }

  revalidatePath("/", "layout")
  redirect("/")
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
    redirect("/signup?error=" + encodeURIComponent(error.message))
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

