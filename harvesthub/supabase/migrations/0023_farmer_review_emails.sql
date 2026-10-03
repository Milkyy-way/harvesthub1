-- HarvestHub — email a farmer when their application is approved or
-- rejected. BUILT BUT SWITCHED OFF: decided with the user (2026-10-03) that
-- during development, approving/rejecting in Studio should just flip the
-- status (the farmer app unlocks or shows the rejection) with no email.
--
-- How it works: an AFTER UPDATE trigger on farmer_verification fires when
-- status changes to 'approved' or 'rejected'. Only if
-- app_config.farmer_review_emails_enabled = 'true' does it queue a POST to
-- Resend's email API through pg_net. pg_net queues the request inside the
-- same transaction and sends it after commit, so a rolled-back status
-- change never emails anyone. Any error while building or queuing the email
-- (pg_net not enabled, no API key in Vault, ...) is caught and logged as a
-- WARNING, never raised: an email problem must never block an approval.
--
-- The rejection email includes reviewer_notes, so set the notes and the
-- status in the same Studio save (the trigger reads the row as saved).
--
-- To turn emails on (production):
--   1. Resend: create an account, add and verify the harvesthubmarket.com
--      domain (it gives you DNS records to add), and create an API key.
--   2. Enable the pg_net extension: Dashboard -> Database -> Extensions, or
--        create extension if not exists pg_net;
--   3. Store the API key in Supabase Vault:
--        select vault.create_secret('re_...', 'resend_api_key');
--   4. Flip the switch:
--        update app_config set value = 'true' where key = 'farmer_review_emails_enabled';
--   email_from (below) must be an address on the verified domain.
-- To turn them off again, set the flag back to 'false'.

-- ---------------------------------------------------------------------
-- app_config — small key/value switches for server-side behavior. No RLS
-- policies on purpose: only the table owner (Studio/SQL editor) and
-- security-definer functions read it; app clients never see it.

create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;
revoke all on app_config from anon, authenticated;

insert into app_config (key, value) values
  ('farmer_review_emails_enabled', 'false'),
  ('email_from', 'HarvestHub <no-reply@harvesthubmarket.com>')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------

create or replace function public.notify_farmer_review_decision()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_enabled text;
  v_from text;
  v_api_key text;
  v_email text;
  v_name text;
  v_farm text;
  v_subject text;
  v_body text;
begin
  if new.status is not distinct from old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  select value into v_enabled from app_config where key = 'farmer_review_emails_enabled';
  if coalesce(v_enabled, 'false') <> 'true' then
    return new; -- switched off (the default): the status change is all that happens
  end if;

  begin
    select value into v_from from app_config where key = 'email_from';
    select email into v_email from auth.users where id = new.id;
    select full_name into v_name from profiles where id = new.id;
    select farm_name into v_farm from farmer_profiles where id = new.id;
    select decrypted_secret into v_api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;

    if v_email is null or v_api_key is null then
      raise warning 'Farmer review email not sent for %: no %', new.id,
        case when v_email is null then 'email address' else 'resend_api_key in Vault' end;
      return new;
    end if;

    if new.status = 'approved' then
      v_subject := 'Your HarvestHub farmer account has been approved';
      v_body := format(
        E'Hi %s,\n\nGood news: %s has been approved on HarvestHub.\n\nOpen the HarvestHub app and log in to get started.\n\nThe HarvestHub team',
        coalesce(v_name, 'there'), coalesce(v_farm, 'your farm')
      );
    else
      v_subject := 'Update on your HarvestHub farmer application';
      v_body := format(
        E'Hi %s,\n\nWe weren''t able to approve %s yet.\n\n%sYou can update your application and resubmit it from the HarvestHub app.\n\nThe HarvestHub team',
        coalesce(v_name, 'there'), coalesce(v_farm, 'your farm'),
        case
          when nullif(trim(new.reviewer_notes), '') is not null then E'Reviewer notes:\n' || new.reviewer_notes || E'\n\n'
          else ''
        end
      );
    end if;

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', coalesce(v_from, 'HarvestHub <no-reply@harvesthubmarket.com>'),
        'to', jsonb_build_array(v_email),
        'subject', v_subject,
        'text', v_body
      )
    );
  exception when others then
    raise warning 'Farmer review email failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_farmer_verification_review_decision on farmer_verification;
create trigger on_farmer_verification_review_decision
  after update of status on farmer_verification
  for each row execute procedure public.notify_farmer_review_decision();
