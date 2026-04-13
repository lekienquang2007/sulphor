import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// DELETE /api/rules/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("allocation_rules")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "rule_changed",
    metadata: { action: "deleted", rule_id: params.id },
  })

  return NextResponse.json({ success: true })
}
