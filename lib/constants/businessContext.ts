// Shared constants for the Business Context onboarding flow

export const SUPPLY_TYPE_OPTIONS = [
  { id: 'standard_rated', label: 'Standard rated' },
  { id: 'zero_rated', label: 'Zero rated' },
  { id: 'vat_exempt', label: 'VAT exempt' },
  { id: 'mixed', label: 'Mixed supplies' },
  { id: 'services', label: 'Services' },
  { id: 'goods', label: 'Goods' },
] as const

export const VAT_SCHEME_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'flat_rate', label: 'Flat rate' },
  { id: 'cash_accounting', label: 'Cash accounting' },
  { id: 'retail', label: 'Retail' },
  { id: 'margin', label: 'Margin' },
  { id: 'other', label: 'Other' },
] as const

export const REGISTRATION_TIMELINE_OPTIONS = [
  { id: 'next_3_months', label: 'Next 3 months' },
  { id: 'next_6_months', label: 'Next 6 months' },
  { id: 'next_12_months', label: 'Next 12 months' },
  { id: 'unknown', label: 'Not sure yet' },
] as const

export const MAIN_CATEGORY_OPTIONS = [
  { id: 'Services', label: 'Services' },
  { id: 'Retail / Goods', label: 'Retail / Goods' },
  { id: 'Manufacturing, Production and Construction', label: 'Manufacturing / Production' },
  { id: 'Wholesale / Distribution', label: 'Wholesale / Distribution' },
  { id: 'Online & Digital', label: 'Online & Digital' },
  { id: 'Personal', label: 'Personal' },
] as const

export const SUBCATEGORY_OPTIONS = {
  Services: [
    { id: 'Personal Services', label: 'Personal Services' },
    { id: 'Professional Services', label: 'Professional Services' },
    { id: 'Food & Beverage Services', label: 'Food & Beverage Services' },
    { id: 'Restaurants & Bars', label: 'Restaurants & Bars' },
    { id: 'Wellness & Beauty', label: 'Wellness & Beauty' },
    { id: 'Fitness & Health', label: 'Fitness & Health' },
    { id: 'Property', label: 'Property' },
    { id: 'Short-Term Rentals', label: 'Short-Term Rentals' },
    { id: 'Consulting', label: 'Consulting' },
    { id: 'Healthcare', label: 'Healthcare' },
  ],
  'Retail / Goods': [
    { id: 'Clothing & Apparel', label: 'Clothing & Apparel' },
    { id: 'Grocery & Food', label: 'Grocery & Food' },
    { id: 'Electronics & Appliances', label: 'Electronics & Appliances' },
    { id: 'Home Goods & Furnishings', label: 'Home Goods & Furnishings' },
    { id: 'General Merchandise', label: 'General Merchandise' },
  ],
  'Manufacturing, Production and Construction': [
    { id: 'Food & Beverage Production', label: 'Food & Beverage Production' },
    { id: 'Manufacturing', label: 'Manufacturing' },
    { id: 'Crafts', label: 'Crafts' },
    { id: 'Printing & Publishing', label: 'Printing & Publishing' },
    { id: 'Building and Construction', label: 'Building and Construction' },
  ],
  'Wholesale / Distribution': [
    { id: 'Wholesale Trade', label: 'Wholesale Trade' },
    { id: 'Distribution & Logistics', label: 'Distribution & Logistics' },
    { id: 'Warehousing & Fulfillment', label: 'Warehousing & Fulfillment' },
    { id: 'Import & Export', label: 'Import & Export' },
    { id: 'B2B Supplies', label: 'B2B Supplies' },
  ],
  'Online & Digital': [
    { id: 'E-commerce', label: 'E-commerce' },
    { id: 'Digital Services', label: 'Digital Services' },
    { id: 'Online Education', label: 'Online Education' },
    { id: 'Content Creation', label: 'Content Creation' },
    { id: 'SaaS & Software', label: 'SaaS & Software' },
    { id: 'Online Consulting', label: 'Online Consulting' },
    { id: 'Digital Products', label: 'Digital Products' },
  ],
  Personal: [{ id: 'Personal', label: 'Personal' }],
} as const

export function getDefaultSubcategory(mainCategory: string) {
  const list = SUBCATEGORY_OPTIONS[mainCategory as keyof typeof SUBCATEGORY_OPTIONS]
  if (!list) {
    return 'Professional Services'
  }
  return list[0].id
}


