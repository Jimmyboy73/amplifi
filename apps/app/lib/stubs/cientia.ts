export interface WalletBalance {
  available: number
  pending: number
  currency: string
}

export interface SweepConfirmation {
  sweepId: string
  amount: number
  status: 'pending' | 'complete'
  reference: string
}

export interface CardLinkedOffer {
  id: string
  merchantName: string
  cashbackPercent: number
  terms: string
}

export async function getWalletBalance(): Promise<WalletBalance> {
  console.log('[STUB] Cientia: getWalletBalance called')
  return { available: 12.5, pending: 3.25, currency: 'GBP' }
}

export async function initiateSweep(
  amount: number,
  sortCode: string,
  accountNumber: string,
  reference: string,
): Promise<SweepConfirmation> {
  console.log('[STUB] Cientia: initiateSweep called')
  void sortCode
  void accountNumber
  return {
    sweepId: `sweep_${Date.now()}`,
    amount,
    status: 'pending',
    reference,
  }
}

export async function getCardLinkedOffers(): Promise<CardLinkedOffer[]> {
  console.log('[STUB] Cientia: getCardLinkedOffers called')
  return [
    { id: 'offer-001', merchantName: 'Boots', cashbackPercent: 5.0, terms: 'On beauty purchases over £10' },
    { id: 'offer-002', merchantName: 'Costa Coffee', cashbackPercent: 10.0, terms: 'On any purchase' },
    { id: 'offer-003', merchantName: 'BP', cashbackPercent: 2.0, terms: 'On fuel purchases' },
  ]
}
