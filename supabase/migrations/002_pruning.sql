-- Pruning function: called by the daily cron job
-- event_logs: keep 90 days
-- stripe_balance_snapshots: keep 90 days (app only ever reads the latest)
create or replace function prune_old_data()
returns jsonb
language plpgsql
security definer
as $$
declare
  deleted_logs integer;
  deleted_snapshots integer;
begin
  delete from event_logs
  where created_at < now() - interval '90 days';
  get diagnostics deleted_logs = row_count;

  delete from stripe_balance_snapshots
  where snapshot_at < now() - interval '90 days';
  get diagnostics deleted_snapshots = row_count;

  return jsonb_build_object(
    'deleted_event_logs', deleted_logs,
    'deleted_balance_snapshots', deleted_snapshots
  );
end;
$$;

-- Allow the service role (used by the cron route) to call it
grant execute on function prune_old_data() to service_role;
