import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextRaw = searchParams.get("next") ?? "/"
  // Restrict `next` to relative paths to prevent open-redirect vulnerabilities.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/"
  const isRecovery = next.startsWith("/reset-password")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Failed (no code, expired, or already-used). For password recovery we keep
  // the user on the reset page with an explicit "link invalid" flag so they
  // can request a new email; otherwise fall back to the login banner.
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password?invalid=1`)
  }
  return NextResponse.redirect(`${origin}/login?errorCode=unknown`)
}

