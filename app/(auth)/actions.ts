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

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error, data: signUpData } = await supabase.auth.signUp({
    ...data,
    options: isDev ? { emailRedirectTo: undefined } : undefined,
  })

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message))
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

