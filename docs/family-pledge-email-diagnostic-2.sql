-- Post-v3 diagnosis. Run all four, paste every result back.

-- 1) How many create_family_pledge overloads exist now? (expect EXACTLY ONE row)
select p.oid::regprocedure as signature
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'create_family_pledge' and n.nspname = 'public';

-- 2) Was recipient_email stored on the REST-created test row (created AFTER you ran v3)?
select token, channel, recipient_email
from family_pledge_invites
where token = '6b8e479b9b3ea7c0a6d23daefc76cbb9';

-- 3) Call the function DIRECTLY in SQL (bypasses PostgREST) ...
select create_family_pledge(
  'Direct SQL Test', 1000, 'weekly', 'on_account_open', 'msg',
  'Tester', 's@e.com', 'grandparent', 'email', null, null, 'direct-test@example.com'
) as direct_token;

-- 4) ... and check whether THAT stored recipient_email.
select token, recipient_email
from family_pledge_invites
where recipient_email = 'direct-test@example.com';
