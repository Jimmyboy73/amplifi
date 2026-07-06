-- Corrected create_family_pledge — replaces the function in place (no full re-run needed).
-- Fix: pgcrypto lives in the `extensions` schema on Supabase, so gen_random_bytes is
-- schema-qualified since this SECURITY DEFINER function pins search_path = public.
-- Run this whole file in the Supabase SQL Editor.

create or replace function create_family_pledge(
  p_child_name         text,
  p_amount_pennies     int,
  p_frequency          text,
  p_start_trigger      text,
  p_personal_message   text,
  p_pledger_name       text,
  p_pledger_email      text,
  p_relationship       text,
  p_channel            text,
  p_approx_age_months  int  default null,
  p_custom_start_date  date default null,
  p_recipient_email    text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_child_id  uuid;
  v_pledge_id uuid;
  v_token     text;
begin
  insert into children (name, approx_age_months, account_status)
  values (p_child_name, p_approx_age_months, 'no_account')
  returning id into v_child_id;

  insert into family_pledges (
    child_id, pledger_name, pledger_email, pledger_relationship,
    amount_pennies, frequency, start_trigger, custom_start_date,
    personal_message, status, sent_at
  ) values (
    v_child_id, p_pledger_name, p_pledger_email, p_relationship,
    p_amount_pennies, p_frequency, p_start_trigger, p_custom_start_date,
    p_personal_message, 'sent', now()
  ) returning id into v_pledge_id;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  insert into family_pledge_invites (token, direction, child_id, pledge_id, channel, recipient_email)
  values (v_token, 'pledge_to_parent', v_child_id, v_pledge_id, p_channel, p_recipient_email);

  return v_token;
end;
$$;

grant execute on function create_family_pledge(
  text, int, text, text, text, text, text, text, text, int, date, text
) to anon, authenticated;
