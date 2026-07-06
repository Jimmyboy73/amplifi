// Trimmed row types for the three MVP flows. Schema is identical to apps/app;
// only the tables the web MVP touches are modelled here.

export type Profile = {
  id: string
  full_name: string
  email: string | null
}

export type Child = {
  id: string
  owner_id: string
  name: string
  date_of_birth: string | null
  approx_age_months: number | null
  photo_url: string | null
  created_at: string
}

export type JisaAccount = {
  id: string
  child_id: string
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

export type ConnectionStatus = 'invited' | 'pending' | 'approved' | 'revoked'

export type FamilyConnection = {
  id: string
  requester_id: string | null
  child_id: string
  parent_id: string
  status: ConnectionStatus
  relationship: string | null
  invited_name: string | null
  created_at: string
}

export type Frequency = 'weekly' | 'monthly' | 'one_off'

export type FamilyContribution = {
  id: string
  connection_id: string
  user_id: string
  child_id: string
  amount_gbp: number
  frequency: Frequency
  status: 'active' | 'stopped'
  started_at: string | null
  created_at: string
  stopped_at: string | null
}

// Relationship picker — label shown in UI, value written to DB.
// DB CHECK allows ONLY: grandparent, aunt, uncle, aunt_uncle, friend, other.
// The parent's self-connection is NOT 'parent' (that would violate the CHECK) — it's
// written with relationship = NULL and identified by requester_id === parent_id.
export const RELATIONSHIPS = ['Grandparent', 'Aunt / Uncle', 'Friend', 'Other'] as const
export const RELATIONSHIP_DB: Record<string, string> = {
  'Grandparent': 'grandparent',
  'Aunt / Uncle': 'aunt_uncle',
  'Friend': 'friend',
  'Other': 'other',
}
export const RELATIONSHIP_LABEL: Record<string, string> = {
  grandparent: 'Grandparent',
  aunt_uncle: 'Aunt / Uncle',
  friend: 'Friend',
  other: 'Family member',
  parent: 'Parent',
}

export const FREQ_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  one_off: 'One-off',
}
