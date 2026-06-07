// Auto-generated database types for Amplifi Supabase schema.
// Regenerate after schema changes: supabase gen types typescript --local

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          date_of_birth: string | null
          avatar_url: string | null
          payment_method: string
          payment_detail: string
          pay_monzo: string | null
          pay_paypal: string | null
          pay_revolut: string | null
          pay_bank: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          avatar_url?: string | null
          payment_method?: string
          payment_detail?: string
          pay_monzo?: string | null
          pay_paypal?: string | null
          pay_revolut?: string | null
          pay_bank?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          avatar_url?: string | null
          payment_method?: string
          payment_detail?: string
          pay_monzo?: string | null
          pay_paypal?: string | null
          pay_revolut?: string | null
          pay_bank?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      children: {
        Row: {
          id: string
          owner_id: string
          name: string
          date_of_birth: string
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          date_of_birth: string
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          date_of_birth?: string
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'children_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      jisa_accounts: {
        Row: {
          id: string
          child_id: string
          sort_code: string
          account_number: string
          payment_reference: string
          provider_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          sort_code: string
          account_number: string
          payment_reference: string
          provider_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          sort_code?: string
          account_number?: string
          payment_reference?: string
          provider_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'jisa_accounts_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      wallets: {
        Row: {
          id: string
          owner_id: string
          balance: number
          total_earned: number
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          balance?: number
          total_earned?: number
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          balance?: number
          total_earned?: number
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'wallets_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      gift_card_purchases: {
        Row: {
          id: string
          user_id: string
          child_id: string
          merchant_name: string
          merchant_category: string | null
          denomination: number
          cashback_percent: number
          cashback_amount: number
          tillo_order_id: string | null
          status: 'processing' | 'delivered' | 'failed' | 'refunded'
          gift_card_code: string | null
          created_at: string
          delivered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          child_id: string
          merchant_name: string
          merchant_category?: string | null
          denomination: number
          cashback_percent: number
          cashback_amount: number
          tillo_order_id?: string | null
          status?: 'processing' | 'delivered' | 'failed' | 'refunded'
          gift_card_code?: string | null
          created_at?: string
          delivered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          child_id?: string
          merchant_name?: string
          merchant_category?: string | null
          denomination?: number
          cashback_percent?: number
          cashback_amount?: number
          tillo_order_id?: string | null
          status?: 'processing' | 'delivered' | 'failed' | 'refunded'
          gift_card_code?: string | null
          created_at?: string
          delivered_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'gift_card_purchases_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'gift_card_purchases_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      contributions: {
        Row: {
          id: string
          child_id: string
          user_id: string | null
          type: 'gift_card' | 'sweep' | 'family' | 'clo' | 'challenge' | 'birthday_surplus'
          description: string
          amount: number
          source_ref: string | null
          source_table: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          user_id?: string | null
          type: 'gift_card' | 'sweep' | 'family' | 'clo' | 'challenge' | 'birthday_surplus'
          description: string
          amount: number
          source_ref?: string | null
          source_table?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          user_id?: string | null
          type?: 'gift_card' | 'sweep' | 'family' | 'clo' | 'challenge' | 'birthday_surplus'
          description?: string
          amount?: number
          source_ref?: string | null
          source_table?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'contributions_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      sweeps: {
        Row: {
          id: string
          child_id: string
          jisa_account_id: string
          amount: number
          cientia_sweep_id: string | null
          status: 'pending' | 'processing' | 'complete' | 'failed'
          initiated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          jisa_account_id: string
          amount: number
          cientia_sweep_id?: string | null
          status?: 'pending' | 'processing' | 'complete' | 'failed'
          initiated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          jisa_account_id?: string
          amount?: number
          cientia_sweep_id?: string | null
          status?: 'pending' | 'processing' | 'complete' | 'failed'
          initiated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'sweeps_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] },
          { foreignKeyName: 'sweeps_jisa_account_id_fkey'; columns: ['jisa_account_id']; referencedRelation: 'jisa_accounts'; referencedColumns: ['id'] }
        ]
      }

      family_contributors: {
        Row: {
          id: string
          child_id: string
          contributor_user_id: string | null
          name: string
          relationship: string | null
          email: string | null
          avatar_color: string
          total_contributed: number
          last_active_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          child_id: string
          contributor_user_id?: string | null
          name: string
          relationship?: string | null
          email?: string | null
          avatar_color?: string
          total_contributed?: number
          last_active_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          contributor_user_id?: string | null
          name?: string
          relationship?: string | null
          email?: string | null
          avatar_color?: string
          total_contributed?: number
          last_active_at?: string | null
          joined_at?: string
        }
        Relationships: [
          { foreignKeyName: 'family_contributors_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      family_invites: {
        Row: {
          id: string
          child_id: string
          inviter_user_id: string
          invited_name: string
          sent_to_email: string
          invite_token: string
          status: 'pending' | 'accepted' | 'expired'
          sent_at: string
          accepted_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          child_id: string
          inviter_user_id: string
          invited_name: string
          sent_to_email: string
          invite_token: string
          status?: 'pending' | 'accepted' | 'expired'
          sent_at?: string
          accepted_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          inviter_user_id?: string
          invited_name?: string
          sent_to_email?: string
          invite_token?: string
          status?: 'pending' | 'accepted' | 'expired'
          sent_at?: string
          accepted_at?: string | null
          expires_at?: string
        }
        Relationships: [
          { foreignKeyName: 'family_invites_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      clo_offers: {
        Row: {
          id: string
          merchant_name: string
          merchant_category: string | null
          cashback_percent: number
          description: string | null
          logo_initial: string | null
          brand_color: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          merchant_name: string
          merchant_category?: string | null
          cashback_percent: number
          description?: string | null
          logo_initial?: string | null
          brand_color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          merchant_name?: string
          merchant_category?: string | null
          cashback_percent?: number
          description?: string | null
          logo_initial?: string | null
          brand_color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      activatable_offers: {
        Row: {
          id: string
          merchant_name: string
          merchant_category: string | null
          cashback_percent: number
          description: string | null
          logo_initial: string | null
          brand_color: string | null
          expiry_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          merchant_name: string
          merchant_category?: string | null
          cashback_percent: number
          description?: string | null
          logo_initial?: string | null
          brand_color?: string | null
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          merchant_name?: string
          merchant_category?: string | null
          cashback_percent?: number
          description?: string | null
          logo_initial?: string | null
          brand_color?: string | null
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      user_activated_offers: {
        Row: {
          id: string
          user_id: string
          offer_id: string
          activated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          offer_id: string
          activated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          offer_id?: string
          activated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'user_activated_offers_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'user_activated_offers_offer_id_fkey'; columns: ['offer_id']; referencedRelation: 'activatable_offers'; referencedColumns: ['id'] }
        ]
      }

      challenges: {
        Row: {
          id: string
          merchant_name: string
          challenge_description: string
          reward_amount: number
          target_count: number
          logo_initial: string | null
          brand_color: string | null
          expiry_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          merchant_name: string
          challenge_description: string
          reward_amount: number
          target_count?: number
          logo_initial?: string | null
          brand_color?: string | null
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          merchant_name?: string
          challenge_description?: string
          reward_amount?: number
          target_count?: number
          logo_initial?: string | null
          brand_color?: string | null
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      user_challenge_state: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          child_id: string | null
          progress: number
          status: 'active' | 'completed' | 'expired'
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          child_id?: string | null
          progress?: number
          status?: 'active' | 'completed' | 'expired'
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          child_id?: string | null
          progress?: number
          status?: 'active' | 'completed' | 'expired'
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'user_challenge_state_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'user_challenge_state_challenge_id_fkey'; columns: ['challenge_id']; referencedRelation: 'challenges'; referencedColumns: ['id'] }
        ]
      }

      pending_credits: {
        Row: {
          id: string
          child_id: string
          source_type: 'gift_card' | 'clo' | 'challenge' | 'family' | 'birthday_surplus'
          source_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'swept' | 'reversed'
          created_at: string
          swept_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          source_type: 'gift_card' | 'clo' | 'challenge' | 'family' | 'birthday_surplus'
          source_id?: string | null
          amount: number
          currency?: string
          status?: 'pending' | 'swept' | 'reversed'
          created_at?: string
          swept_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          source_type?: 'gift_card' | 'clo' | 'challenge' | 'family' | 'birthday_surplus'
          source_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'swept' | 'reversed'
          created_at?: string
          swept_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'pending_credits_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] }
        ]
      }

      merchant_invoice_ledger: {
        Row: {
          id: string
          merchant_name: string
          invoice_ref: string | null
          gross_amount: number
          cashback_amount: number
          amplifi_margin: number | null
          settled: boolean
          period_start: string | null
          period_end: string | null
          created_at: string
          settled_at: string | null
        }
        Insert: {
          id?: string
          merchant_name: string
          invoice_ref?: string | null
          gross_amount: number
          cashback_amount: number
          amplifi_margin?: number | null
          settled?: boolean
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          settled_at?: string | null
        }
        Update: {
          id?: string
          merchant_name?: string
          invoice_ref?: string | null
          gross_amount?: number
          cashback_amount?: number
          amplifi_margin?: number | null
          settled?: boolean
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          settled_at?: string | null
        }
        Relationships: []
      }

      wishlists: {
        Row: {
          id: string
          child_id: string
          owner_id: string
          occasion: string
          occasion_label: string | null
          occasion_date: string
          closing_date: string | null
          status: 'active' | 'closed'
          total_target: number
          total_pledged: number
          surplus_amount: number
          payment_method: string
          payment_detail: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          owner_id: string
          occasion: string
          occasion_label?: string | null
          occasion_date: string
          closing_date?: string | null
          status?: 'active' | 'closed'
          total_target?: number
          total_pledged?: number
          surplus_amount?: number
          payment_method: string
          payment_detail?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          owner_id?: string
          occasion?: string
          occasion_label?: string | null
          occasion_date?: string
          closing_date?: string | null
          status?: 'active' | 'closed'
          total_target?: number
          total_pledged?: number
          surplus_amount?: number
          payment_method?: string
          payment_detail?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'wishlists_child_id_fkey'; columns: ['child_id']; referencedRelation: 'children'; referencedColumns: ['id'] },
          { foreignKeyName: 'wishlists_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      wishlist_items: {
        Row: {
          id: string
          wishlist_id: string
          name: string
          retailer: string | null
          target_amount: number
          pledged_amount: number
          emoji: string
          purchased: boolean
          created_at: string
        }
        Insert: {
          id?: string
          wishlist_id: string
          name: string
          retailer?: string | null
          target_amount: number
          pledged_amount?: number
          emoji?: string
          purchased?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          wishlist_id?: string
          name?: string
          retailer?: string | null
          target_amount?: number
          pledged_amount?: number
          emoji?: string
          purchased?: boolean
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'wishlist_items_wishlist_id_fkey'; columns: ['wishlist_id']; referencedRelation: 'wishlists'; referencedColumns: ['id'] }
        ]
      }

      pledges: {
        Row: {
          id: string
          wishlist_id: string
          wishlist_item_id: string | null
          pledger_name: string
          pledger_email: string | null
          amount: number
          item_label: string | null
          status: 'pending' | 'confirmed' | 'swept'
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wishlist_id: string
          wishlist_item_id?: string | null
          pledger_name: string
          pledger_email?: string | null
          amount: number
          item_label?: string | null
          status?: 'pending' | 'confirmed' | 'swept'
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wishlist_id?: string
          wishlist_item_id?: string | null
          pledger_name?: string
          pledger_email?: string | null
          amount?: number
          item_label?: string | null
          status?: 'pending' | 'confirmed' | 'swept'
          confirmed_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'pledges_wishlist_id_fkey'; columns: ['wishlist_id']; referencedRelation: 'wishlists'; referencedColumns: ['id'] },
          { foreignKeyName: 'pledges_wishlist_item_id_fkey'; columns: ['wishlist_item_id']; referencedRelation: 'wishlist_items'; referencedColumns: ['id'] }
        ]
      }

      referral_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'referral_codes_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      referral_events: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          code_used: string
          status: 'pending' | 'jisa_linked' | 'credited'
          referrer_credit_gbp: number
          referred_credit_gbp: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          code_used: string
          status?: 'pending' | 'jisa_linked' | 'credited'
          referrer_credit_gbp?: number
          referred_credit_gbp?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          code_used?: string
          status?: 'pending' | 'jisa_linked' | 'credited'
          referrer_credit_gbp?: number
          referred_credit_gbp?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'referral_events_referrer_id_fkey'; columns: ['referrer_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'referral_events_referred_id_fkey'; columns: ['referred_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      referral_credits: {
        Row: {
          id: string
          user_id: string
          amount_gbp: number
          source: 'referrer' | 'referred'
          referral_event_id: string
          status: 'pending' | 'redeemable' | 'redeemed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_gbp: number
          source: 'referrer' | 'referred'
          referral_event_id: string
          status?: 'pending' | 'redeemable' | 'redeemed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_gbp?: number
          source?: 'referrer' | 'referred'
          referral_event_id?: string
          status?: 'pending' | 'redeemable' | 'redeemed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'referral_credits_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'referral_credits_referral_event_id_fkey'; columns: ['referral_event_id']; referencedRelation: 'referral_events'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_wishlist: {
        Args: {
          p_child_id: string
          p_owner_id: string
          p_occasion: string
          p_occasion_label: string
          p_occasion_date: string
          p_closing_date: string
          p_payment_method: string
          p_payment_detail: string
        }
        Returns: {
          id: string
          child_id: string
          owner_id: string
          occasion: string
          occasion_label: string | null
          occasion_date: string
          closing_date: string | null
          status: 'active' | 'closed'
          total_target: number
          total_pledged: number
          surplus_amount: number
          payment_method: string
          payment_detail: string | null
          created_at: string
          updated_at: string
        }
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience type aliases ───────────────────────────────────────────────────

type Tables = Database['public']['Tables']

export type Profile             = Tables['profiles']['Row']
export type Child               = Tables['children']['Row']
export type JisaAccount         = Tables['jisa_accounts']['Row']
export type Wallet              = Tables['wallets']['Row']
export type GiftCardPurchase    = Tables['gift_card_purchases']['Row']
export type Contribution        = Tables['contributions']['Row']
export type Sweep               = Tables['sweeps']['Row']
export type FamilyContributor   = Tables['family_contributors']['Row']
export type FamilyInvite        = Tables['family_invites']['Row']
export type CloOffer            = Tables['clo_offers']['Row']
export type ActivatableOffer    = Tables['activatable_offers']['Row']
export type UserActivatedOffer  = Tables['user_activated_offers']['Row']
export type Challenge           = Tables['challenges']['Row']
export type UserChallengeState  = Tables['user_challenge_state']['Row']
export type PendingCredit       = Tables['pending_credits']['Row']
export type MerchantInvoiceLedger = Tables['merchant_invoice_ledger']['Row']
export type Wishlist            = Tables['wishlists']['Row']
export type WishlistItem        = Tables['wishlist_items']['Row']
export type Pledge              = Tables['pledges']['Row']
export type ReferralCode        = Tables['referral_codes']['Row']
export type ReferralEvent       = Tables['referral_events']['Row']
export type ReferralCredit      = Tables['referral_credits']['Row']
