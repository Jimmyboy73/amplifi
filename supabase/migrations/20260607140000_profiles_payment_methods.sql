-- Add individual per-method payment columns to profiles.
-- These replace the existing single payment_method/payment_detail pair for the
-- guest wishlist page, allowing owners to publish multiple methods at once.
-- The old columns are left in place for now.
--
-- RLS note: when RLS is re-enabled, pay_monzo/pay_paypal/pay_revolut/pay_bank
-- will need a public-read policy so the guest wishlist page can display them
-- for unauthenticated visitors.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pay_monzo   text,
  ADD COLUMN IF NOT EXISTS pay_paypal  text,
  ADD COLUMN IF NOT EXISTS pay_revolut text,
  ADD COLUMN IF NOT EXISTS pay_bank    text;
