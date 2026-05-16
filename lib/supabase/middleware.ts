import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/privacy", "/faq", "/api/"]

// Maximum session inactivity: 8 hours (in seconds)
const MAX_INACTIVITY_SECONDS = 8 * 60 * 60 // 28800s = 8 hours
// Cookie lifetime must be much longer than the inactivity window so the
// previous-activity timestamp survives until the next visit (otherwise the
// cookie expires first, the timestamp is lost, and the inactivity check is silently skipped).
const ACTIVITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const ACTIVITY_COOKIE = "planigo_last_activity"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not remove this line.
  // Refreshes the auth token and keeps the session alive.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // ── Inactivity timeout: force logout after MAX_INACTIVITY_SECONDS ──
  if (user && !isPublicRoute) {
    const lastActivity = request.cookies.get(ACTIVITY_COOKIE)?.value
    const now = Math.floor(Date.now() / 1000)

    if (lastActivity) {
      const elapsed = now - Number(lastActivity)
      if (elapsed > MAX_INACTIVITY_SECONDS) {
        // Session expired due to inactivity — sign out and redirect.
        // signOut() writes "delete cookie" entries to supabaseResponse via the
        // setAll callback above. We must carry those over to the redirect
        // response, otherwise the Supabase auth cookies stay in the browser
        // and the user remains logged in on the next request.
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("expired", "1")
        const redirectResponse = NextResponse.redirect(url)
        for (const cookie of supabaseResponse.cookies.getAll()) {
          redirectResponse.cookies.set(cookie)
        }
        redirectResponse.cookies.delete(ACTIVITY_COOKIE)
        return redirectResponse
      }
    }

    // Update last activity timestamp
    supabaseResponse.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACTIVITY_COOKIE_MAX_AGE,
      path: "/",
    })
  }

  // If no user and trying to access a protected route → redirect to login,
  // preserving the original path + query so we can send the user back after sign-in
  // (this is what enables deep-links from email reminders to land on the right task).
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    const target = pathname + (request.nextUrl.search || "")
    if (target && target !== "/") {
      url.searchParams.set("next", target)
    }
    return NextResponse.redirect(url)
  }

  // If logged in and trying to access login/signup → redirect to home (or to ?next= if present)
  // /reset-password is intentionally excluded: the user is in a recovery session
  // (created by /auth/callback after exchanging the email code) and must stay on
  // that page to set their new password.
  // /api/* is excluded: API routes are listed as public so unauthenticated calls
  // (cron, welcome-email) pass through, but logged-in client fetches must NOT be
  // redirected to "/" (would return HTML and break JSON parsing).
  if (
    user &&
    isPublicRoute &&
    pathname !== "/auth/callback" &&
    pathname !== "/reset-password" &&
    !pathname.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone()
    const nextParam = request.nextUrl.searchParams.get("next")
    // Only honor relative paths to avoid open-redirect vulnerabilities
    if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
      return NextResponse.redirect(new URL(nextParam, request.url))
    }
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

