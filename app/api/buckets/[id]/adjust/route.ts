import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// POST /api/buckets/[id]/adjust
// Body: { amount_dollars: number, description?: string }
// Positive amount = add to bucket, negative = remove from bucket
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { allowed } = rateLimit(`buckets:adjust:${user.id}`, { windowMs: 60_000, max: 30 })
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const body = await request.json()
  const { amount_dollars, description } = body as {
    amount_dollars: number
    description?: string
  }

  if (typeof amount_dollars !== "number" || amount_dollars === 0) {
    return NextResponse.json({ error: "amount_dollars must be a non-zero number" }, { status: 400 })
  }

  // Clamp to reasonable range: ±$1,000,000
  if (Math.abs(amount_dollars) > 1_000_000) {
    return NextResponse.json({ error: "Amount out of range" }, { status: 400 })
  }

  // Load bucket — must belong to this user
  const { data: bucket } = await supabase
    .from("virtual_buckets")
    .select("id, current_balance, label")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 })

  const amount_cents = Math.round(amount_dollars * 100)
  const new_balance = bucket.current_balance + amount_cents

  // Record ledger entry
  await supabase.from("virtual_bucket_entries").insert({
    user_id: user.id,
    bucket_id: bucket.id,
    payout_plan_id: null,
    amount: amount_cents,
    description: description?.trim() || `Manual adjustment`,
  })

  // Update bucket balance
  await supabase
    .from("virtual_buckets")
    .update({ current_balance: new_balance })
    .eq("id", bucket.id)

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "bucket_adjusted",
    metadata: {
      bucket_id: bucket.id,
      bucket_label: bucket.label,
      amount_cents,
      new_balance,
    },
  })

  return NextResponse.json({ ok: true, new_balance })
}
