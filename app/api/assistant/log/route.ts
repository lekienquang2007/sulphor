import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ALLOWED_EVENTS = ["assistant_draft_approved", "assistant_draft_discarded"] as const
type AllowedEvent = (typeof ALLOWED_EVENTS)[number]

// POST /api/assistant/log — client-triggered event logging for approve/discard actions
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { event_type, metadata } = body as { event_type: string; metadata?: Record<string, unknown> }

  if (!ALLOWED_EVENTS.includes(event_type as AllowedEvent)) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 })
  }

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type,
    metadata: metadata ?? {},
  })

  return NextResponse.json({ ok: true })
}
