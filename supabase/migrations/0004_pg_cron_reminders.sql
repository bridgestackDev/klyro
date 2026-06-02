-- pg_cron job: dispatch due messages every 5 minutes.
-- The cron job calls the dispatch-due-messages Edge Function via pg_net.
--
-- PREREQUISITES (must be done out-of-band; not encodable in a migration):
--   1. The dispatch-due-messages Edge Function must be deployed.
--   2. A Vault secret named `edge_dispatch_service_key` must hold the project's
--      service-role key. Create it in the dashboard:
--      Project Settings → Vault → New secret
--        name:   edge_dispatch_service_key
--        secret: <SUPABASE_SERVICE_ROLE_KEY>
--      (The Edge Function has verify_jwt=true; the service-role key is the JWT
--       that passes the gateway. The public publishable/anon key does NOT pass.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch-due-messages') then
    perform cron.unschedule('dispatch-due-messages');
  end if;
end $$;

select cron.schedule(
  'dispatch-due-messages',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := 'https://ouexfehqxpgewzgytjgc.supabase.co/functions/v1/dispatch-due-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_dispatch_service_key')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
