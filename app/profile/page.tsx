import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileClient from "./ProfileClient"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ""}
      firstName={user.user_metadata?.first_name ?? ""}
      lastName={user.user_metadata?.last_name ?? ""}
      autoArchive={user.user_metadata?.auto_archive ?? false}
      notifications={user.user_metadata?.notifications ?? true}
    />
  )
}

