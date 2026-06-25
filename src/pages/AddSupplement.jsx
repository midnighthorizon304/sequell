import { useState, useEffect } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { Bot, Save, Plus, Trash2, AlertCircle, CheckCircle, ChevronRight, ArrowLeft, X, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useSupplements } from '../context/SupplementContext'
import { useNavigate, useParams } from 'react-router-dom'

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Vitamins', 'Minerals', 'Omega Fatty Acids', 'Probiotics',
  'Multivitamin', 'Prescription', 'Herbal', 'Amino Acids', 'Other',
]

const TIMING_OPTIONS = [
  { value: 'wake',          label: 'On Waking' },
  { value: 'wake_30',       label: 'Wake + 30min' },
  { value: 'first_meal',    label: 'First Meal' },
  { value: 'between_meals', label: 'Between Meals' },
  { value: 'evening',       label: 'Evening' },
  { value: 'bedtime',       label: 'Bedtime' },
]

const EMPTY_FORM = {
  name: '', brand: '', category: 'Vitamins',
  dose_per_serving: '1 cap', servings_per_day: 1,
  dose_multiplier: 1,
  timing: [], timing_notes: '',
  suggested_use: '', cautions: '',
  other_ingredients: [],
  nutrients: [],
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const VARIANT_PROMPT = `You are a supplement variant detector. Given a supplement query, decide if it is specific enough to identify a single product, or if it matches multiple meaningfully different versions.

A query IS specific enough if it clearly states a dose amount AND form (e.g. "Vitamin D3 2000 IU softgel"), OR names a precise SKU.

A query is AMBIGUOUS if a common product comes in multiple dose strengths, delivery forms with different nutrient profiles, or importantly different formulations (chewable vs. swallowable changes sugar content; time-release vs. standard changes absorption).

Do NOT list variants for minor differences like packaging count. Only list variants where the choice affects what nutrients or doses end up in the body.

Return JSON — one of two shapes:

If specific:
{ "specific": true }

If ambiguous:
{
  "specific": false,
  "variants": [
    {
      "label": "Brand + key differentiator",
      "descriptor": "Short spec line (e.g. 1000 IU · softgel · standard dose)",
      "query": "Exact descriptive string to pass to the label parser"
    }
  ]
}

Return 2–4 variants maximum. Return ONLY valid JSON. No markdown fences.`

const PARSE_PROMPT = `You are a supplement label data extractor. Given a specific supplement name, return a JSON object with exactly these fields:
{
  "name": "Full product name",
  "brand": "Brand name or empty string",
  "category": "One of: Vitamins, Minerals, Omega Fatty Acids, Probiotics, Multivitamin, Prescription, Herbal, Amino Acids, Other",
  "dose_per_serving": "e.g. '1 cap', '2 softgels', '1 tablet'",
  "servings_per_day": 1,
  "timing": ["array using only: wake, wake_30, first_meal, between_meals, evening, bedtime"],
  "timing_notes": "Specific timing instructions",
  "suggested_use": "Verbatim suggested use text from the label, or empty string if unknown",
  "cautions": "Any caution, warning, or advisory text from the label (e.g. blood clotting warnings, pregnancy warnings). Empty string if none.",
  "other_ingredients": ["Inactive ingredients exactly as on the label, e.g. 'Hypromellose (capsule)', 'Microcrystalline Cellulose', 'Silicon Dioxide'"],
  "nutrients": [
    {
      "name": "Short tracking name — base nutrient without form or brand, used for aggregation across supplements (e.g. 'Iron', 'Vitamin C', 'Vitamin D3', 'Magnesium')",
      "full_name": "COMPLETE name exactly as printed on label — ALWAYS include the parenthetical form when one is listed (e.g. 'Iron (as Ferrochel® Ferrous Bisglycinate Chelate)', 'Vitamin C (as Ascorbic Acid)', 'Magnesium (as Magnesium Glycinate)', 'Zinc (as Zinc Bisglycinate Chelate)'). Set equal to name ONLY when the label lists no form.",
      "amount": 25,
      "unit": "mg",
      "dv_percent": 139,
      "dv_source": "label",
      "strains": null
    }
  ]
}

For probiotic nutrients, populate strains as an array: [{"name": "Lactobacillus acidophilus", "cfu": "2.5 billion"}]. For all others set strains to null.

CRITICAL rules for dv_percent:
- dv_percent MUST be the exact integer printed in the "% Daily Value" column on the product label. Never calculate — read the label value directly from your product knowledge.
- Set dv_source to "label" when you know the exact label value.
- Only fall back to calculation (dv_source: "fda_rdi") when you cannot confirm the exact label value. Use CURRENT 2020 FDA Daily Values: Vitamin C 90mg, Vitamin D 20mcg, Calcium 1300mg, Iron 18mg, Vitamin E 15mg, B1 1.2mg, B2 1.3mg, Niacin 16mg, B6 1.7mg, Folate 400mcg DFE, B12 2.4mcg, Biotin 30mcg, Pantothenic Acid 5mg, Phosphorus 1250mg, Iodine 150mcg, Magnesium 420mg, Zinc 11mg, Selenium 55mcg, Copper 0.9mg, Manganese 2.3mg, Potassium 4700mg.
- Set dv_percent and dv_source to null if no DV is established (omega-3s, probiotics CFU, etc.).
- Never invent or estimate a value you are not confident in.
- Include ALL nutrients listed in the Supplement Facts panel.
Return ONLY valid JSON. No markdown fences.`

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClient() {
  return new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })
}

function stripFences(text) {
  let s = text.trim()
  s = s.replace(/^```[a-zA-Z]*\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (m) s = m[1]
  }
  return s
}

function shapeForm(json) {
  return {
    name:             json.name || '',
    brand:            json.brand || '',
    category:         json.category || 'Vitamins',
    dose_per_serving: json.dose_per_serving || '1 cap',
    servings_per_day: Number(json.servings_per_day) || 1,
    dose_multiplier:  1,
    timing:           Array.isArray(json.timing) ? json.timing : [],
    timing_notes:     json.timing_notes || '',
    suggested_use:    json.suggested_use || '',
    cautions:         json.cautions || '',
    other_ingredients: Array.isArray(json.other_ingredients) ? json.other_ingredients : [],
    nutrients: Array.isArray(json.nutrients)
      ? json.nutrients.map(n => ({
          name:       n.name || '',
          full_name:  n.full_name || null,
          amount:     n.amount ?? 0,
          unit:       n.unit || '',
          dv_percent: n.dv_percent ?? null,
          dv_source:  n.dv_source ?? null,
          strains:    Array.isArray(n.strains) && n.strains.length ? n.strains : null,
        }))
      : [],
  }
}

// ── Component ────────────────────────────────────────────────────────────────

// step: 'idle' | 'detecting' | 'selecting' | 'parsing' | 'parsed'
export default function AddSupplement() {
  const { id: editId }  = useParams()
  const isEdit          = !!editId
  const [editLoaded, setEditLoaded] = useState(false)

  const [query, setQuery]       = useState('')
  const [step, setStep]         = useState('idle')
  const [variants, setVariants] = useState([])
  const [error, setError]       = useState('')
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [newIngredient, setNewIngredient] = useState('')
  const [verificationDismissed, setVerificationDismissed] = useState(false)

  const { addSupplement, updateSupplement, supplements } = useSupplements()
  const navigate = useNavigate()

  // Pre-fill form when editing an existing supplement
  useEffect(() => {
    if (!isEdit || editLoaded) return
    const existing = supplements.find(s => s.id === editId)
    if (!existing) return
    setForm({
      name:              existing.name || '',
      brand:             existing.brand || '',
      category:          existing.category || 'Vitamins',
      dose_per_serving:  existing.dose_per_serving || '1 cap',
      servings_per_day:  existing.servings_per_day || 1,
      dose_multiplier:   existing.dose_multiplier || 1,
      timing:            existing.timing || [],
      timing_notes:      existing.timing_notes || '',
      suggested_use:     existing.suggested_use || '',
      cautions:          existing.cautions || '',
      other_ingredients: existing.other_ingredients || [],
      nutrients: (existing.nutrients || []).map(n => ({
        name:       n.name || '',
        full_name:  n.full_name || null,
        amount:     n.amount ?? 0,
        unit:       n.unit || '',
        dv_percent: n.dv_percent ?? null,
        dv_source:  n.dv_source ?? null,
        strains:    n.strains || null,
      })),
    })
    setEditLoaded(true)
  }, [editId, isEdit, supplements, editLoaded])

  // ── AI flow ───────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!query.trim()) return
    setStep('detecting')
    setError('')
    try {
      const msg = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: VARIANT_PROMPT,
        messages: [{ role: 'user', content: query.trim() }],
      })
      const result = JSON.parse(stripFences(msg.content[0].text))
      if (result.specific || !result.variants?.length) {
        await runParse(query.trim())
      } else {
        setVariants(result.variants)
        setStep('selecting')
      }
    } catch (err) {
      setError(err instanceof SyntaxError
        ? 'AI returned unexpected data. Try again or select a variant manually.'
        : (err.message || 'Could not analyze supplement. Try again.'))
      setStep('idle')
    }
  }

  async function handleSelectVariant(variant) {
    await runParse(variant.query || variant.label)
  }

  async function runParse(descriptor) {
    setStep('parsing')
    setError('')
    try {
      const msg = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: PARSE_PROMPT,
        messages: [{ role: 'user', content: descriptor }],
      })
      setForm(shapeForm(JSON.parse(stripFences(msg.content[0].text))))
      setStep('parsed')
    } catch (err) {
      setError(err instanceof SyntaxError
        ? 'AI returned unexpected data. Try again or fill in the form manually.'
        : (err.message || 'Failed to parse supplement data. Try again.'))
      setStep('idle')
    }
  }

  function handleReset() {
    setStep('idle'); setVariants([]); setError(''); setForm(EMPTY_FORM); setSaved(false)
    setVerificationDismissed(false)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(isVerified = false) {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      verified:    isVerified,
      verified_at: isVerified ? new Date().toISOString() : null,
    }
    if (isEdit) {
      await updateSupplement(editId, payload)
    } else {
      await addSupplement(payload)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => navigate('/stack'), 1200)
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function toggleTiming(value) {
    setForm(f => ({
      ...f,
      timing: f.timing.includes(value) ? f.timing.filter(t => t !== value) : [...f.timing, value],
    }))
  }

  function updateNutrient(i, field, value) {
    setForm(f => {
      const nutrients = [...f.nutrients]
      const coerced = field === 'name' || field === 'unit' || field === 'full_name'
        ? value
        : value === '' ? null : Number(value)
      const extra = field === 'dv_percent' ? { dv_source: null } : {}
      nutrients[i] = { ...nutrients[i], [field]: coerced, ...extra }
      return { ...f, nutrients }
    })
  }

  function addNutrient() {
    setForm(f => ({ ...f, nutrients: [...f.nutrients, { name: '', full_name: null, amount: 0, unit: 'mg', dv_percent: null, dv_source: null, strains: null }] }))
  }

  function removeNutrient(i) {
    setForm(f => ({ ...f, nutrients: f.nutrients.filter((_, j) => j !== i) }))
  }

  function addIngredient() {
    const val = newIngredient.trim()
    if (!val) return
    setForm(f => ({ ...f, other_ingredients: [...f.other_ingredients, val] }))
    setNewIngredient('')
  }

  function removeIngredient(i) {
    setForm(f => ({ ...f, other_ingredients: f.other_ingredients.filter((_, j) => j !== i) }))
  }

  const busy      = step === 'detecting' || step === 'parsing'
  const busyLabel = step === 'detecting' ? 'Checking variants…' : 'Filling in details…'
  const effectiveDvNutrients = form.nutrients.filter(n => n.dv_percent != null)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">{isEdit ? 'Edit Supplement' : 'Add Supplement'}</div>
        <div className="page-subtitle">{isEdit ? 'Update the details below' : 'Type a name and let AI fill in the details'}</div>
      </div>

      {/* ── AI Autofill (add mode only) ── */}
      {!isEdit && <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={13} /> AI Autofill
        </div>

        {step !== 'selecting' && (
          <div className="form-group">
            <label>Supplement name or description</label>
            <textarea
              placeholder="e.g. Vitamin D3, Nature Made Fish Oil, Magnesium Glycinate 400mg"
              value={query}
              onChange={e => { setQuery(e.target.value); if (step !== 'idle') handleReset() }}
              style={{ minHeight: 68 }}
              disabled={busy || step === 'parsed'}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAnalyze() }}
            />
          </div>
        )}

        {step === 'idle' && (
          <button className="btn btn-primary btn-full" onClick={handleAnalyze} disabled={!query.trim()}>
            <Bot size={15} /> Analyze with AI
          </button>
        )}

        {busy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', justifyContent: 'center' }}>
            <div className="spinner" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{busyLabel}</span>
          </div>
        )}

        {step === 'selecting' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Which version do you have?</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Multiple versions found for <em>"{query}"</em></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectVariant(v)}
                  style={{
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    borderRadius: 10, padding: '12px 14px', textAlign: 'left',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s', width: '100%', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-50)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.descriptor}</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-light)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm btn-full" onClick={handleReset} style={{ marginTop: 10, gap: 5 }}>
              <ArrowLeft size={13} /> Edit search
            </button>
          </div>
        )}

        {step === 'parsed' && (
          <div>
            <div className="alert alert-success">
              <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Autofilled — review and edit below, then save.
            </div>
            <button className="btn btn-ghost btn-sm btn-full" onClick={handleReset} style={{ marginTop: 8, gap: 5 }}>
              <ArrowLeft size={13} /> Start over
            </button>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ marginTop: 10 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}
      </div>}

      {/* ── Supplement Details ── */}
      <div className="card">
        <div className="card-title">Supplement Details</div>

        <div className="form-group">
          <label>Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>Brand</label>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>Dose per serving</label>
            <input value={form.dose_per_serving} onChange={e => setForm(f => ({ ...f, dose_per_serving: e.target.value }))} placeholder="1 cap" />
          </div>
          <div className="form-group">
            <label>Servings / day</label>
            <input type="number" min="0.5" step="0.5" value={form.servings_per_day}
              onChange={e => setForm(f => ({ ...f, servings_per_day: Number(e.target.value) }))} />
          </div>
        </div>

        {/* Dosage multiplier */}
        <div className="form-group">
          <label>Dosage multiplier</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min="1" max="10" step="0.5"
              value={form.dose_multiplier}
              onChange={e => setForm(f => ({ ...f, dose_multiplier: Number(e.target.value) }))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>× label serving</span>
          </div>
          {form.dose_multiplier > 1 && effectiveDvNutrients.length > 0 && (
            <div style={{ fontSize: 11, color: '#f97316', marginTop: 5, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '5px 8px' }}>
              Taking {form.dose_multiplier}× the label dose — % DV values below show your actual intake
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Timing</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TIMING_OPTIONS.map(t => (
              <button
                key={t.value} type="button"
                className={`badge ${form.timing.includes(t.value) ? 'badge-green' : 'badge-gray'}`}
                style={{ cursor: 'pointer', border: '1px solid', borderColor: form.timing.includes(t.value) ? 'var(--brand-200)' : 'var(--border)', padding: '5px 10px', fontSize: 12 }}
                onClick={() => toggleTiming(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Timing notes</label>
          <input value={form.timing_notes} onChange={e => setForm(f => ({ ...f, timing_notes: e.target.value }))} placeholder="e.g. Take with food" />
        </div>

        <div className="form-group">
          <label>Suggested use</label>
          <textarea
            value={form.suggested_use}
            onChange={e => setForm(f => ({ ...f, suggested_use: e.target.value }))}
            placeholder="Verbatim suggested use from label…"
            style={{ minHeight: 60 }}
          />
        </div>

        <div className="form-group">
          <label>Cautions / Warnings</label>
          <textarea
            value={form.cautions}
            onChange={e => setForm(f => ({ ...f, cautions: e.target.value }))}
            placeholder="Any warnings from the label…"
            style={{ minHeight: 60 }}
          />
        </div>
      </div>

      {/* ── Nutrients ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Nutrients</div>
          <button className="btn btn-secondary btn-sm" onClick={addNutrient} style={{ gap: 4 }}>
            <Plus size={12} /> Add
          </button>
        </div>

        {form.nutrients.length === 0 && (
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>No nutrients added yet</p>
        )}

        {/* Column headers */}
        {form.nutrients.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto', gap: 6, marginBottom: 4, paddingLeft: 2 }}>
            {['Name', 'Amt', 'Unit', '% DV', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
            ))}
          </div>
        )}

        {form.nutrients.map((n, i) => {
          const effectiveDv = n.dv_percent != null ? Math.round(n.dv_percent * form.dose_multiplier) : null
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto', gap: 6, alignItems: 'center' }}>
                <input placeholder="Name" value={n.name} onChange={e => updateNutrient(i, 'name', e.target.value)} style={{ fontSize: 12, padding: '7px 9px' }} />
                <input placeholder="Amt" type="number" value={n.amount ?? ''} onChange={e => updateNutrient(i, 'amount', e.target.value)} style={{ fontSize: 12, padding: '7px 9px' }} />
                <input placeholder="Unit" value={n.unit} onChange={e => updateNutrient(i, 'unit', e.target.value)} style={{ fontSize: 12, padding: '7px 9px' }} />
                <div style={{ position: 'relative' }}>
                  <input placeholder="% DV" type="number" value={n.dv_percent ?? ''} onChange={e => updateNutrient(i, 'dv_percent', e.target.value)} style={{ fontSize: 12, padding: '7px 9px' }} />
                  {n.dv_source && (
                    <span style={{
                      position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, pointerEvents: 'none',
                      background: n.dv_source === 'label' ? '#e8f4ef' : '#eff6ff',
                      color: n.dv_source === 'label' ? '#1a6b4a' : '#1d4ed8',
                    }}>
                      {n.dv_source === 'label' ? 'LABEL' : 'RDI'}
                    </span>
                  )}
                </div>
                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => removeNutrient(i)} style={{ padding: 6 }}>
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
              {/* Effective DV preview when multiplier > 1 */}
              {form.dose_multiplier > 1 && effectiveDv != null && (
                <div style={{ fontSize: 10, color: '#f97316', marginTop: 3, paddingLeft: 4 }}>
                  Effective at {form.dose_multiplier}×: {effectiveDv}% DV
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Other Ingredients ── */}
      <div className="card">
        <div className="card-title">Other Ingredients</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: form.other_ingredients.length ? 10 : 0 }}>
          {form.other_ingredients.map((ing, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--border-light)', borderRadius: 99, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
              {ing}
              <button onClick={() => removeIngredient(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <X size={11} color="#94a3b8" />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="e.g. Hypromellose (capsule)"
            value={newIngredient}
            onChange={e => setNewIngredient(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={addIngredient} style={{ gap: 4, flexShrink: 0 }}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* ── Verification banner (AI autofill path only) ── */}
      {step === 'parsed' && !verificationDismissed && !saved && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12,
          padding: '14px 14px 12px', marginTop: 4,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55, margin: 0 }}>
              <strong>Please verify this data matches your product label.</strong>{' '}
              The information below was pulled from your photo and/or our supplement database.
              Dosages, nutrients, and % Daily Values can vary between product versions and lot dates.
              Please confirm the details match what's printed on your bottle before saving.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => setVerificationDismissed(true)}
              disabled={saving}
              style={{ flex: 1 }}
            >
              Edit
            </button>
            <button
              className="btn btn-primary btn-full"
              onClick={() => handleSave(true)}
              disabled={!form.name.trim() || saving}
              style={{ flex: 2, background: '#059669', borderColor: '#059669' }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Saving…</>
                : <><ShieldCheck size={15} /> Looks good — Save</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Regular save (manual entry or after dismissing banner) ── */}
      {(step !== 'parsed' || verificationDismissed || saved) && (
        <button
          className="btn btn-primary btn-full"
          onClick={() => handleSave(false)}
          disabled={!form.name.trim() || saving || saved}
          style={{ marginTop: 4 }}
        >
          {saved
            ? <><CheckCircle size={16} /> Saved!</>
            : saving
            ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
            : isEdit
            ? <><Save size={16} /> Save Changes</>
            : <><Save size={16} /> Save to Stack</>
          }
        </button>
      )}

      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
        AI analysis uses Claude Haiku. API key is in your browser bundle —<br />
        proxy via a backend before sharing this app.
      </p>
    </div>
  )
}
