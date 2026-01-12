export type UnitDefinition = {
  name: string
  abbreviation: string | string[]
  category: 'weight' | 'volume' | 'count' | 'kitchen'
  system: 'metric' | 'imperial_uk' | 'imperial_us'
  baseValue: number
  aliases?: string[]
}

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  // ========== WEIGHT (MASS) UNITS ==========

  // Metric
  {
    name: 'Milligram',
    abbreviation: 'mg',
    category: 'weight',
    system: 'metric',
    baseValue: 0.001, // grams
  },
  {
    name: 'Gram',
    abbreviation: 'g',
    category: 'weight',
    system: 'metric',
    baseValue: 1, // base unit
  },
  {
    name: 'Kilogram',
    abbreviation: ['kg', 'kgs'],
    category: 'weight',
    system: 'metric',
    baseValue: 1000, // grams
  },
  {
    name: 'Metric Tonne',
    abbreviation: ['t', 'tonne', 'metric ton'],
    category: 'weight',
    system: 'metric',
    baseValue: 1000000, // grams
  },

  // Imperial/US
  {
    name: 'Grain',
    abbreviation: ['gr', 'grains'],
    category: 'weight',
    system: 'imperial_us',
    baseValue: 0.0648, // grams
  },
  {
    name: 'Ounce',
    abbreviation: ['oz', 'ozs'],
    category: 'weight',
    system: 'imperial_us',
    baseValue: 28.35, // grams
    aliases: ['ounce', 'ounces'],
  },
  {
    name: 'Pound',
    abbreviation: ['lb', 'lbs', 'pound', 'pounds'],
    category: 'weight',
    system: 'imperial_us',
    baseValue: 453.59, // grams
    aliases: ['1b', '1bs'], // Common OCR mistake: "1b" instead of "lb"
  },
  {
    name: 'Stone',
    abbreviation: ['st', 'stone', 'stones'],
    category: 'weight',
    system: 'imperial_uk',
    baseValue: 6350, // grams (6.35 kg)
  },
  {
    name: 'Quarter',
    abbreviation: ['qtr', 'quarter', 'quarters'],
    category: 'weight',
    system: 'imperial_uk',
    baseValue: 12700, // grams (12.7 kg)
  },
  {
    name: 'Hundredweight',
    abbreviation: ['cwt', 'hundredweight'],
    category: 'weight',
    system: 'imperial_uk',
    baseValue: 50800, // grams (50.8 kg) - UK version
  },
  {
    name: 'Ton (UK Long)',
    abbreviation: ['ton', 'tons', 'long ton', 'uk ton'],
    category: 'weight',
    system: 'imperial_uk',
    baseValue: 1016000, // grams (1,016 kg)
  },
  {
    name: 'Ton (US Short)',
    abbreviation: ['short ton', 'us ton'],
    category: 'weight',
    system: 'imperial_us',
    baseValue: 907185, // grams (907.185 kg)
  },

  // ========== VOLUME (LIQUID CAPACITY) UNITS ==========

  // Metric
  {
    name: 'Millilitre',
    abbreviation: ['ml', 'mls', 'milliliter', 'milliliters'],
    category: 'volume',
    system: 'metric',
    baseValue: 1, // base unit
    aliases: ['mil', 'mils'], // Common misspellings
  },
  {
    name: 'Centilitre',
    abbreviation: ['cl', 'cls', 'centiliter', 'centiliters'],
    category: 'volume',
    system: 'metric',
    baseValue: 10, // ml
  },
  {
    name: 'Litre',
    abbreviation: ['l', 'L', 'liter', 'liters', 'litre', 'litres'],
    category: 'volume',
    system: 'metric',
    baseValue: 1000, // ml
  },
  {
    name: 'Cubic Metre',
    abbreviation: ['m³', 'm3', 'cubic meter', 'cubic metre'],
    category: 'volume',
    system: 'metric',
    baseValue: 1000000, // ml
  },

  // UK Imperial
  {
    name: 'Fluid Ounce (UK)',
    abbreviation: ['fl oz', 'floz', 'fluid ounce', 'fluid ounces'],
    category: 'volume',
    system: 'imperial_uk',
    baseValue: 28.41, // ml
  },
  {
    name: 'Gill (UK)',
    abbreviation: ['gi', 'gill', 'gills'],
    category: 'volume',
    system: 'imperial_uk',
    baseValue: 142, // ml
  },
  {
    name: 'Pint (UK)',
    abbreviation: ['pt', 'pint', 'pints'],
    category: 'volume',
    system: 'imperial_uk',
    baseValue: 568, // ml (20 fl oz)
  },
  {
    name: 'Quart (UK)',
    abbreviation: ['qt', 'quart', 'quarts'],
    category: 'volume',
    system: 'imperial_uk',
    baseValue: 1136.52, // ml (2 pints, 40 fl oz)
  },
  {
    name: 'Gallon (UK)',
    abbreviation: ['gal', 'gallon', 'gallons'],
    category: 'volume',
    system: 'imperial_uk',
    baseValue: 4540, // ml (4.54 L)
  },

  // US Imperial
  {
    name: 'Fluid Ounce (US)',
    abbreviation: ['fl oz (us)', 'us fl oz'],
    category: 'volume',
    system: 'imperial_us',
    baseValue: 29.57, // ml
  },
  {
    name: 'Pint (US)',
    abbreviation: ['pt (us)', 'us pt'],
    category: 'volume',
    system: 'imperial_us',
    baseValue: 473.18, // ml (16 fl oz)
  },
  {
    name: 'Gallon (US)',
    abbreviation: ['gal (us)', 'us gal'],
    category: 'volume',
    system: 'imperial_us',
    baseValue: 3785.41, // ml (3.78 L)
  },

  // ========== COMMON KITCHEN MEASURES ==========
  {
    name: 'Teaspoon',
    abbreviation: ['tsp', 'teaspoon', 'teaspoons'],
    category: 'kitchen',
    system: 'imperial_us',
    baseValue: 5, // ml
  },
  {
    name: 'Tablespoon',
    abbreviation: ['tbsp', 'tablespoon', 'tablespoons'],
    category: 'kitchen',
    system: 'imperial_us',
    baseValue: 15, // ml (3 teaspoons)
    aliases: ['tbs', 'tbsps'], // Common misspellings
  },
  {
    name: 'Cup (US)',
    abbreviation: ['cup', 'cups'],
    category: 'kitchen',
    system: 'imperial_us',
    baseValue: 240, // ml
  },

  // ========== COUNT-BASED UNITS ==========
  {
    name: 'Count',
    abbreviation: ['count', 'cnt', 'ct', 'cts'],
    category: 'count',
    system: 'metric', // Not really metric, but neutral
    baseValue: 1, // Base unit for count (1 count = 1 item)
    aliases: ['piece', 'pieces', 'pcs', 'pc', 'item', 'items', 'unit', 'units'],
  },
  {
    name: 'Each',
    abbreviation: ['each', 'ea', 'e.a.', 'e a'],
    category: 'count',
    system: 'metric', // Not really metric, but neutral
    baseValue: 1, // Base unit for count (1 each = 1 item)
    aliases: ['per', 'apiece'],
  },
]

// Helper function to get primary abbreviation
export function getPrimaryAbbreviation(unit: UnitDefinition): string {
  if (typeof unit.abbreviation === 'string') {
    return unit.abbreviation
  }
  return unit.abbreviation[0]
}

// Helper function to format unit display
export function formatUnitDisplay(unit: UnitDefinition): string {
  const abbrev = getPrimaryAbbreviation(unit)
  return `${unit.name} (${abbrev})`
}

// Helper function to find unit by abbreviation or name
export function findUnitByAbbreviation(abbrev: string): UnitDefinition | undefined {
  const normalized = abbrev.toLowerCase().trim()
  return UNIT_DEFINITIONS.find((unit) => {
    const abbrevs = typeof unit.abbreviation === 'string' 
      ? [unit.abbreviation] 
      : unit.abbreviation
    const allAbbrevs = abbrevs.map(a => a.toLowerCase())
    const aliases = (unit.aliases || []).map(a => a.toLowerCase())
    return allAbbrevs.includes(normalized) || aliases.includes(normalized)
  })
}

// Helper function to get units by category
export function getUnitsByCategory(category: 'weight' | 'volume' | 'count' | 'kitchen'): UnitDefinition[] {
  return UNIT_DEFINITIONS.filter((unit) => unit.category === category)
}

// Helper function to determine category from unit string
export function determineCategoryFromUnit(unit: string): 'weight' | 'volume' | 'count' | 'kitchen' | null {
  const found = findUnitByAbbreviation(unit)
  return found ? found.category : null
}

