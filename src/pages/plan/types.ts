export interface PlanData {
  ageChip: number
  monthly: number
  childName: string
  dobDay: string
  dobMonth: string
  dobYear: string
  gender: string
  childAgeMonths: number
  familyContrib: string
  housingStatus: string
  childBenefit: string
  giftSpend: string
  cashback: string
}

export const initialPlanData: PlanData = {
  ageChip: 0,
  monthly: 50,
  childName: '',
  dobDay: '',
  dobMonth: '',
  dobYear: '',
  gender: '',
  childAgeMonths: 0,
  familyContrib: '',
  housingStatus: '',
  childBenefit: '',
  giftSpend: '',
  cashback: '',
}
