import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Dashboard from "@/components/Layout_Principal"

type SearchParams = Promise<{ openTask?: string; view?: string }>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  const params = await searchParams

  return (
    <Dashboard
      initialTasks={tasks ?? []}
      userId={user.id}
      initialOpenTaskId={params.openTask}
      initialView={params.view}
    />
  )
}
