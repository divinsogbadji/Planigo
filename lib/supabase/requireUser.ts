/**
 * Server-side auth guard for API routes.
 * Returns the authenticated user or a 401 NextResponse to short-circuit the handler.
 */

import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type AuthGuardResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse }

export async function requireUser(): Promise<AuthGuardResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { user, response: null }
}
