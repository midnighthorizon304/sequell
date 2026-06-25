// One-time DB update script — run after unpausing Supabase:
//   node scripts/update-db.js
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

async function main() {
  console.log('\n── DELETES ──────────────────────────────')

  let { error } = await supabase.from('supplements').delete().eq('name', 'Nature Made Vitamin D3 2000 IU')
  ok('Delete Nature Made Vitamin D3 2000 IU', error)

  ;({ error } = await supabase.from('supplements').delete().eq('name', 'Life Extension Neuro-Mag'))
  ok('Delete Life Extension Neuro-Mag', error)

  console.log('\n── INSERTS ──────────────────────────────')

  const newSupplements = [
    {
      name: 'Bloom Greens & Superfoods',
      brand: 'Bloom Nutrition',
      category: 'Other',
      dose_per_serving: '1 scoop (6.12g)',
      servings_per_day: 1,
      timing: ['first_meal'],
      timing_notes: 'Contains greens blend, probiotics 2.5B CFU, adaptogens, digestive enzymes.',
      nutrients: [
        { name: 'Vitamin B12', full_name: 'Vitamin B12 (as methylcobalamin)', amount: 3.6, unit: 'mcg', dv_percent: 150, dv_source: 'label', strains: null },
        { name: 'Iron', full_name: 'Iron (as blend)', amount: 0.5, unit: 'mg', dv_percent: 3, dv_source: 'label', strains: null },
      ],
    },
    {
      name: 'Grass Fed Collagen Peptides',
      brand: 'Garden of Life',
      category: 'Amino Acids',
      dose_per_serving: '1 scoop (20g)',
      servings_per_day: 1,
      timing: ['first_meal'],
      timing_notes: 'Type I and III collagen, unflavored.',
      nutrients: [
        { name: 'Protein', full_name: 'Protein', amount: 18, unit: 'g', dv_percent: null, dv_source: null, strains: null },
        { name: 'Collagen Peptides', full_name: 'Collagen Peptides (from Bovine Hide)', amount: 20, unit: 'g', dv_percent: null, dv_source: null, strains: null },
        {
          name: 'Bacillus coagulans',
          full_name: 'Bacillus coagulans SNZ 1969',
          amount: 250,
          unit: 'M CFU',
          dv_percent: null,
          dv_source: null,
          strains: [{ name: 'Bacillus coagulans SNZ 1969', cfu: '250 million' }],
        },
      ],
    },
    {
      name: 'Double Strength L-Theanine 200mg',
      brand: "Nature's Truth",
      category: 'Amino Acids',
      dose_per_serving: '1 capsule',
      servings_per_day: 1,
      timing: ['bedtime'],
      timing_notes: 'Take on empty stomach, 1 hour before bed.',
      nutrients: [
        { name: 'L-Theanine', full_name: 'L-Theanine', amount: 200, unit: 'mg', dv_percent: null, dv_source: null, strains: null },
      ],
    },
    {
      name: 'D3 + K2',
      brand: 'Nature Made',
      category: 'Vitamins',
      dose_per_serving: '1 softgel',
      servings_per_day: 1,
      timing: ['first_meal'],
      timing_notes: 'Fat soluble, take with food.',
      nutrients: [
        { name: 'Vitamin D3', full_name: 'Vitamin D3 (as Cholecalciferol)', amount: 125, unit: 'mcg', dv_percent: 625, dv_source: 'label', strains: null },
        { name: 'Vitamin K2', full_name: 'Vitamin K2 (as all-trans Menaquinone-7)', amount: 100, unit: 'mcg', dv_percent: null, dv_source: null, strains: null },
      ],
    },
    {
      name: 'Trazodone',
      brand: '',
      category: 'Prescription',
      dose_per_serving: '1 tablet',
      servings_per_day: 1,
      timing: ['bedtime'],
      timing_notes: 'Take 1 hour before sleep with Magnesium Glycinate and L-Theanine.',
      nutrients: [],
    },
  ]

  for (const supp of newSupplements) {
    const { error: insertErr } = await supabase.from('supplements').insert([supp])
    ok(`Insert ${supp.name}`, insertErr)
  }

  console.log('\n── UPDATES ──────────────────────────────')

  ;({ error } = await supabase
    .from('supplements')
    .update({ servings_per_day: 2 })
    .ilike('name', '%Probiotic-10%'))
  ok('NOW Foods Probiotic-10 → servings_per_day: 2', error)

  // Confirm timing is first_meal for Fish Oil (update regardless to ensure correct value)
  ;({ error } = await supabase
    .from('supplements')
    .update({ timing: ['first_meal'] })
    .ilike('name', '%Fish Oil%'))
  ok('Nature Made Fish Oil → timing: first_meal (confirmed)', error)

  // Confirm timing is first_meal for Multi For Him
  ;({ error } = await supabase
    .from('supplements')
    .update({ timing: ['first_meal'] })
    .ilike('name', '%Multi For Him%'))
  ok('Nature Made Multi For Him → timing: first_meal (confirmed)', error)

  console.log('\n── DONE ─────────────────────────────────\n')
}

main().catch(console.error)
