export interface GiftCard {
  id: string
  name: string
  cashbackPercent: number
  denominations: number[]
  category: string
}

export interface PurchaseConfirmation {
  orderId: string
  cardId: string
  denomination: number
  code: string
  expiresAt: string
}

export async function getGiftCards(): Promise<GiftCard[]> {
  console.log('[STUB] Tillo: getGiftCards called')
  return [
    { id: 'tesco-001', name: 'Tesco', cashbackPercent: 3.5, denominations: [10, 25, 50, 100], category: 'Supermarket' },
    { id: 'sainsburys-001', name: "Sainsbury's", cashbackPercent: 3.0, denominations: [10, 25, 50, 100], category: 'Supermarket' },
    { id: 'asda-001', name: 'ASDA', cashbackPercent: 2.5, denominations: [10, 25, 50, 100], category: 'Supermarket' },
    { id: 'amazon-001', name: 'Amazon', cashbackPercent: 1.5, denominations: [10, 25, 50, 100], category: 'Online' },
    { id: 'ms-001', name: 'M&S', cashbackPercent: 4.0, denominations: [10, 25, 50, 100], category: 'Supermarket' },
  ]
}

export async function purchaseGiftCard(
  cardId: string,
  denomination: number,
): Promise<PurchaseConfirmation> {
  console.log('[STUB] Tillo: purchaseGiftCard called')
  return {
    orderId: `ord_${Date.now()}`,
    cardId,
    denomination,
    code: 'STUB-1234-5678-9012',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
}
