-- Scheduled job pour appeler la fonction re-engagement chaque jour à 18h UTC via pg_cron.
-- Crée une tâche cron qui appelle la edge function via HTTP POST.
-- NOTE: Pour que ça marche, la fonction edge doit accepter les requêtes sans CRON_SECRET
-- (ou CRON_SECRET doit rester vide dans Supabase Secrets). Les appels internes (pg_cron)
-- ne peuvent pas passer le secret depuis PostgreSQL.

-- Active l'extension pg_cron si elle ne l'est pas déjà
create extension if not exists pg_cron with schema extensions;

-- Crée la tâche cron : appelle la edge function chaque jour à 18h UTC
select cron.schedule(
  're-engagement-daily',
  '0 18 * * *',
  'select http_post(
     ''https://airakqqfpetzpbrrlyqq.supabase.co/functions/v1/re-engagement'',
     ''{}'',
     ''application/json''
   )'
);
