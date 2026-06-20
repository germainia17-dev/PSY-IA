-- Add last_message_at to track user activity for daily push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- Schedule daily push at 20:00 UTC via pg_cron
-- Note: pg_cron extension must be enabled. If it's not, run:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- GRANT USAGE ON SCHEMA cron TO postgres;

-- Delete existing schedule if any
SELECT cron.unschedule('daily-push-20h-utc') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-push-20h-utc'
);

-- Schedule the new daily push job
SELECT cron.schedule(
  'daily-push-20h-utc',
  '0 20 * * *',
  $$SELECT net.http_post(
    url:='https://' || current_setting('app.supabase_url') || '/functions/v1/daily-push',
    headers:='{"Authorization": "Bearer ' || current_setting('app.supabase_service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id$$
);
