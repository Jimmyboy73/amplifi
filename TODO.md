# TODO

## Before beta launch

- [ ] Re-enable RLS on all core tables (profiles, children, wallets, wishlists, wishlist_items, jisa_accounts, referral_codes, referral_events, referral_credits)
- [ ] Add a UNIQUE constraint on referral_events.referred_id so a user can't be referred more than once (belt-and-braces behind the app-level guard in redeemReferralCode.ts)
