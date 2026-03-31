import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Dashboard from "@/components/Layout_Principal"

export default async function Page() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  return <Dashboard initialTasks={tasks ?? []} userId={user.id} />
}
