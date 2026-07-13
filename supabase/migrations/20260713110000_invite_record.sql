-- ── Record of who you've invited ───────────────────────────────────────────────
-- The parent had no record of family invites they'd sent. Add an optional recipient_name so
-- link/WhatsApp invites (which carry no email) can still be labelled, and a parent-only read
-- (get_child_invites) so My Family can show "you invited X — waiting / joined". Additive.

alter table family_pledge_invites
  add column if not exists recipient_name text;

-- create_family_invite: accept an optional recipient_name. Signature grows → drop + recreate.
drop function if exists create_family_invite(uuid, text, text);

create or replace function create_family_invite(
  p_child_id        uuid,
  p_channel         text,
  p_recipient_email text default null,
  p_recipient_name  text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_token text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id into v_owner from children where id = p_child_id;
  if v_owner is null then raise exception 'child not found'; end if;
  if v_owner <> v_uid then raise exception 'not your child'; end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into family_pledge_invites
    (token, direction, child_id, created_by_user_id, channel, recipient_email, recipient_name)
  values
    (v_token, 'invite_to_family', p_child_id, v_uid, p_channel, p_recipient_email, p_recipient_name);
  return v_token;
end;
$$;
grant execute on function create_family_invite(uuid, text, text, text) to authenticated;

-- get_child_invites: the parent's outward invites for a child, newest first (owner-gated).
create or replace function get_child_invites(p_child_id uuid)
returns table (
  id             uuid,
  recipient_name text,
  recipient_email text,
  channel        text,
  status         text,
  created_at     timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id into v_owner from children where id = p_child_id;
  if v_owner is null or v_owner <> v_uid then raise exception 'not your child'; end if;

  return query
  select fi.id, fi.recipient_name, fi.recipient_email, fi.channel, fi.status, fi.created_at
  from family_pledge_invites fi
  where fi.child_id = p_child_id
    and fi.direction = 'invite_to_family'
  order by fi.created_at desc;
end;
$$;
grant execute on function get_child_invites(uuid) to authenticated;
