-- Diagnose why §8.2 returns "no recipient". Run in the Supabase SQL Editor and paste
-- both results back. (Run as the SQL Editor user — it bypasses RLS, so it sees the truth.)

-- A) Is recipient_email actually stored on the two diagnostic invite rows?
select token, channel, recipient_email
from family_pledge_invites
where token in (
  '4a5bcc34054855144e962ca87e6714f7',
  '65668d1aa2517dbee3db26fdc6b4fc29'
);

-- B) What does the LIVE create_family_pledge actually do? Look at the
--    "insert into family_pledge_invites (...)" line — does it include recipient_email?
select pg_get_functiondef(
  'create_family_pledge(text,int,text,text,text,text,text,text,text,int,date,text)'::regprocedure
);
