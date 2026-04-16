-- Extend prune_old_data() to also clean up payout_plan_items for old terminal plans.
-- Rules:
--   - Only deletes items whose plan is in a terminal state (approved, reversed, skipped)
--   - Only deletes items older than 1 year
--   - Never touches pending plans (still in use) or the payout_plans rows themselves
--   - virtual_buckets.current_balance is unaffected (already updated at approval time)
--   - virtual_bucket_entries are unaffected (the ledger is separate)
create or replace function prune_old_data()
returns jsonb
language plpgsql
security definer
as $$
declare
  deleted_logs integer;
  deleted_snapshots integer;
  deleted_plan_items integer;
begin
  delete from event_logs
  where created_at < now() - interval '90 days';
  get diagnostics deleted_logs = row_count;

  delete from stripe_balance_snapshots
  where snapshot_at < now() - interval '90 days';
  get diagnostics deleted_snapshots = row_count;

  delete from payout_plan_items
  where payout_plan_id in (
    select id from payout_plans
    where status in ('approved', 'reversed', 'skipped')
    and created_at < now() - interval '1 year'
  );
  get diagnostics deleted_plan_items = row_count;

  return jsonb_build_object(
    'deleted_event_logs', deleted_logs,
    'deleted_balance_snapshots', deleted_snapshots,
    'deleted_plan_items', deleted_plan_items
  );
end;
$$;

grant execute on function prune_old_data() to service_role;
