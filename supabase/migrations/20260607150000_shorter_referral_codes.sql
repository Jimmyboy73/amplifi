-- Replace generate_referral_code() with a 5-character code generator.
-- Uniqueness check and retry loop are preserved.

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candidate TEXT;
  chars     TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i         INT;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..5 LOOP
      candidate := candidate || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars))::INT + 1, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM referral_codes WHERE code = candidate
    );
  END LOOP;

  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, candidate);

  RETURN NEW;
END;
$$;

-- Update the test user's existing code to a 5-character code.
-- Fill in the correct email before applying this migration.
UPDATE public.referral_codes
SET code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 5))
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-test-email@example.com');
