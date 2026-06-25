// One-time Bloom Greens update — run after the previous update-db.js:
//   node scripts/update-bloom.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gxnlyfpsntaascrzemrm.supabase.co',
  'sb_publishable_pRpee-n2uGlgj5IbzWonnQ_wARYs8k2'
)

function ok(label, error) {
  if (error) { console.error(`✗ ${label}:`, error.message); return false }
  console.log(`✓ ${label}`)
  return true
}

const nutrients = [
  // ── Labeled nutrients ──────────────────────────────────────────────────────
  { name: 'Calories',            full_name: 'Calories',                          amount: 20,   unit: 'kcal', dv_percent: null, dv_source: null,    strains: null },
  { name: 'Total Carbohydrate',  full_name: 'Total Carbohydrate',                amount: 4,    unit: 'g',    dv_percent: 1,    dv_source: 'label',  strains: null },
  { name: 'Dietary Fiber',       full_name: 'Dietary Fiber',                     amount: 2,    unit: 'g',    dv_percent: 7,    dv_source: 'label',  strains: null },
  { name: 'Total Sugars',        full_name: 'Total Sugars',                      amount: 1,    unit: 'g',    dv_percent: null, dv_source: null,    strains: null },
  { name: 'Sodium',              full_name: 'Sodium',                            amount: 8,    unit: 'mg',   dv_percent: null, dv_source: null,    strains: null },
  { name: 'Vitamin B12',         full_name: 'Vitamin B12 (as methylcobalamin)',  amount: 3.6,  unit: 'mcg',  dv_percent: 150,  dv_source: 'label',  strains: null },
  { name: 'Iron',                full_name: 'Iron (as blend)',                   amount: 0.5,  unit: 'mg',   dv_percent: 3,    dv_source: 'label',  strains: null },

  // ── Proprietary blends — ingredients stored in strains for expanded view ──
  {
    name: 'Fiber Blend', full_name: 'Fiber Blend', amount: 1606, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Chicory Root Fructo-oligosaccharides', cfu: null },
      { name: 'Organic Flaxseed',                     cfu: null },
      { name: 'Apple Fruit Powder',                   cfu: null },
    ],
  },
  {
    name: 'Green Superfood Blend', full_name: 'Green Superfood Blend', amount: 1367, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Organic Barley Grass Powder',  cfu: null },
      { name: 'Organic Spirulina Powder',     cfu: null },
      { name: 'Organic Wheatgrass Powder',    cfu: null },
      { name: 'Organic Alfalfa Leaf Powder',  cfu: null },
      { name: 'Organic Chlorella Powder',     cfu: null },
    ],
  },
  {
    name: 'Pre and Probiotic Blend', full_name: 'Pre and Probiotic Blend (2.5 billion CFU)', amount: 792, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Blue Agave Inulin',          cfu: null },
      { name: 'Bacillus coagulans',         cfu: '2.5 billion CFU (total)' },
      { name: 'Bifidobacterium bifidum',    cfu: null },
      { name: 'Lactobacillus rhamnosus',    cfu: null },
      { name: 'Lactobacillus acidophilus',  cfu: null },
    ],
  },
  {
    name: 'Fruit and Vegetable Blend', full_name: 'Fruit and Vegetable Blend', amount: 572, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Organic Carrot Powder',   cfu: null },
      { name: 'Beet Root Powder',        cfu: null },
      { name: 'Kale Powder',             cfu: null },
      { name: 'Blueberry Powder',        cfu: null },
      { name: 'Spinach Powder',          cfu: null },
      { name: 'Broccoli Powder',         cfu: null },
      { name: 'Ginger Root 5:1 Extract', cfu: null },
    ],
  },
  {
    name: 'Antioxidant Beauty Blend', full_name: 'Antioxidant Beauty Blend', amount: 550, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Cranberry Fruit Powder',                    cfu: null },
      { name: 'Strawberry Fruit Powder',                   cfu: null },
      { name: 'Raspberry Fruit Powder',                    cfu: null },
      { name: 'Tart Cherry Fruit Powder',                  cfu: null },
      { name: 'Elderberry Fruit Extract',                  cfu: null },
      { name: 'Acai Fruit Extract',                        cfu: null },
      { name: 'Goji Berry (Lycium barbarum)',              cfu: null },
      { name: 'Horseradish Tree Leaf (Moringa oleifera)',  cfu: null },
      { name: 'Grape Seed Extract',                        cfu: null },
      { name: 'Matcha Green Tea Leaf',                     cfu: null },
    ],
  },
  {
    name: 'Adaptogenic Blend', full_name: 'Adaptogenic Blend', amount: 100, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Licorice Root Extract',          cfu: null },
      { name: 'Rhodiola Root Powder',            cfu: null },
      { name: 'American Ginseng Root Extract',  cfu: null },
      { name: 'Ashwagandha Root Powder',         cfu: null },
      { name: 'Astragalus Root Powder',          cfu: null },
      { name: 'Eleuthero Root Powder',           cfu: null },
    ],
  },
  {
    name: 'Digestive Enzyme Blend', full_name: 'Digestive Enzyme Blend', amount: 25, unit: 'mg', dv_percent: null, dv_source: null,
    strains: [
      { name: 'Amylase',            cfu: null },
      { name: 'Amyloglucosidase',   cfu: null },
      { name: 'Protease',           cfu: null },
      { name: 'Acid Protease',      cfu: null },
      { name: 'Cellulase',          cfu: null },
      { name: 'Lipase',             cfu: null },
    ],
  },
]

async function main() {
  console.log('\n── UPDATE: Bloom Greens & Superfoods ────')

  const { error } = await supabase
    .from('supplements')
    .update({
      name:             'Bloom Greens & Superfoods (Orange Passionfruit)',
      brand:            'Bloom Nutrition',
      dose_per_serving: '1 scoop (6.12g)',
      servings_per_day: 1,
      timing:           ['first_meal'],
      timing_notes:     'Mix with 8–12 oz cold water or smoothie. Drink immediately.',
      suggested_use:    'Add 1 scoop to 8-12 fluid ounces of cold water, juice, or smoothie and mix well. Drink immediately after mixing. 1 to 2 servings daily.',
      cautions:         'Before taking any new supplement, consult your health care provider if you have medical conditions, take prescription medications or are pregnant or lactating. Store in a cool, dry place. Keep out of reach of children. Dairy free, Non-GMO.',
      other_ingredients: ['Natural Flavors', 'Citric Acid', 'Stevia Leaf Extract'],
      nutrients,
    })
    .ilike('name', '%Bloom Greens%')

  ok('Updated Bloom Greens & Superfoods with full label data', error)
  console.log('\n── DONE ─────────────────────────────────\n')
}

main().catch(console.error)
