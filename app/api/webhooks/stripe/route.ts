import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { syncPayoutsAndBalance } from "@/lib/stripe-sync"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" })

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createClient()

  // Find the user by stripe account id from the event
  const stripeAccountId = (event as Stripe.Event & { account?: string }).account

  if (!stripeAccountId) {
    return NextResponse.json({ received: true })
  }

  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("user_id, access_token")
    .eq("stripe_account_id", stripeAccountId)
    .eq("status", "active")
    .single()

  if (!connection) {
    return NextResponse.json({ received: true })
  }

  const { user_id: userId, access_token: accessToken } = connection

  switch (event.type) {
    case "payout.created":
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout
      await supabase.from("stripe_payouts").upsert({
        user_id: userId,
        stripe_payout_id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        arrival_date: new Date(payout.arrival_date * 1000).toISOString().split("T")[0],
        status: payout.status,
        description: payout.description ?? null,
      }, { onConflict: "stripe_payout_id" })

      await supabase.from("event_logs").insert({
        user_id: userId,
        event_type: "payout_synced",
        metadata: { stripe_payout_id: payout.id, event: event.type },
      })
      break
    }

    case "payout.updated": {
      const payout = event.data.object as Stripe.Payout
      await handlePayoutUpdate(supabase, userId, payout)
      break
    }

    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout
      await handlePayoutFailure(supabase, userId, payout)
      break
    }

    case "balance.available": {
      // Refresh balance snapshot
      const balance = event.data.object as Stripe.Balance
      const usdAvailable = balance.available.find((b) => b.currency === "usd")
      const usdPending = balance.pending.find((b) => b.currency === "usd")

      await supabase.from("stripe_balance_snapshots").insert({
        user_id: userId,
        available_amount: usdAvailable?.amount ?? 0,
        pending_amount: usdPending?.amount ?? 0,
        currency: "usd",
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function handlePayoutUpdate(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  payout: Stripe.Payout
) {
  // Update payout status
  await supabase
    .from("stripe_payouts")
    .update({ status: payout.status })
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)

  // If payout failed, handle plan reversal
  if (payout.status === "failed") {
    await handlePayoutFailure(supabase, userId, payout)
  }
}

async function handlePayoutFailure(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  payout: Stripe.Payout
) {
  // Update payout status to failed
  await supabase
    .from("stripe_payouts")
    .update({ status: "failed" })
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)

  // Find the stripe_payout row to get its UUID
  const { data: payoutRow } = await supabase
    .from("stripe_payouts")
    .select("id")
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)
    .single()

  if (!payoutRow) return

  // Find any payout plan for this payout
  const { data: plan } = await supabase
    .from("payout_plans")
    .select("id, status")
    .eq("stripe_payout_id", payoutRow.id)
    .eq("user_id", userId)
    .single()

  if (!plan) return

  if (plan.status === "pending") {
    // Auto-cancel pending plans
    await supabase
      .from("payout_plans")
      .update({ status: "reversed" })
      .eq("id", plan.id)
  } else if (plan.status === "approved") {
    // Reverse approved plan: undo virtual bucket entries
    const { data: planItems } = await supabase
      .from("payout_plan_items")
      .select("bucket_name, amount")
      .eq("payout_plan_id", plan.id)

    if (planItems && planItems.length > 0) {
      for (const item of planItems) {
        // Find the bucket
        const { data: bucket } = await supabase
          .from("virtual_buckets")
          .select("id, current_balance")
          .eq("user_id", userId)
          .eq("bucket_name", item.bucket_name)
          .single()

        if (bucket) {
          // Add reversal entry (negative amount)
          await supabase.from("virtual_bucket_entries").insert({
            user_id: userId,
            bucket_id: bucket.id,
            payout_plan_id: plan.id,
            amount: -item.amount,
            description: `Reversal: payout ${payout.id} failed`,
          })

          // Update bucket balance
          await supabase
            .from("virtual_buckets")
            .update({ current_balance: Math.max(0, bucket.current_balance - item.amount) })
            .eq("id", bucket.id)
        }
      }
    }

    // Mark plan as reversed
    await supabase
      .from("payout_plans")
      .update({ status: "reversed" })
      .eq("id", plan.id)

    await supabase.from("event_logs").insert({
      user_id: userId,
      event_type: "plan_reversed",
      metadata: { plan_id: plan.id, stripe_payout_id: payout.id, reason: "payout_failed" },
    })
  }
}
