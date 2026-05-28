import { useState } from 'react'
import { AlertTriangle, TrendingUp, Zap, Info, XCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useSupplements } from '../context/SupplementContext'
import { usePreferences } from '../hooks/usePreferences'
import { KEY_NUTRIENTS } from '../lib/defaultData'

function ScoreGauge({ pct }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#1a6b4a' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="48" y="44" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{pct}%</text>
        <text x="48" y="58" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">COVERAGE</text>
      </svg>
    </div>
  )
}

const CRITICAL_GAPS = [
  {
    name: 'Potassium',
    dv: 0,
    rec: '4,700 mg/day',
    note: 'Not in your stack. Critical electrolyte for heart, muscle, and nerve function. Most diets are already deficient.',
    suggestion: 'Consider a potassium supplement (99mg caps — higher doses regulated) or increase avocado, banana, leafy greens.',
  },
  {
    name: 'Calcium',
    dv: 12,
    rec: '1,000–1,200 mg/day',
    note: 'Only 162 mg from your Multi (12% DV). You\'re getting ~1,038 mg less than recommended daily.',
    suggestion: 'Add calcium citrate 500mg with D3 (already have) and Mg (already have) for co-factors. Split doses — max 500mg absorbed at once.',
  },
  {
    name: 'Vitamin K2 (MK-7)',
    dv: null,
    rec: '100–200 mcg/day',
    note: 'Not in your stack. Your Vitamin K from the Multi is K1 (phylloquinone), which does NOT direct calcium to bones.',
    suggestion: 'Add K2 MK-7 100mcg. Critical synergy: your high-dose D3 (375% DV) increases calcium absorption — K2 routes it to bones instead of arteries.',
  },
]

const MONITOR_FLAGS = [
  {
    name: 'Vitamin D3',
    dv: 375,
    icon: '☀️',
    note: '250% from standalone + 125% from Multi. 375% DV = 7,500 IU/day is above the typical 2,000 IU recommendation but below the 4,000 IU tolerable upper limit. Monitor 25(OH)D blood levels.',
    status: 'warn',
  },
  {
    name: 'Vitamin B12',
    dv: 750,
    icon: '⚡',
    note: '18mcg from Multi = 750% DV. B12 has no established upper limit — excess is excreted. However, very high doses (>1mg/day) may cause acne in some people. 750% DV = 18mcg, which is well within safe range.',
    status: 'info',
  },
  {
    name: 'Iron',
    dv: 139,
    icon: '🔩',
    note: '25mg is above the 18mg RDA (139% DV) but below the 45mg UL. You are intentionally supplementing due to your stack design (No-Iron Multi + separate iron). Recheck ferritin levels every 6 months.',
    status: 'warn',
  },
]

const SYNERGIES = [
  {
    pair: 'Vitamin D3 + Magnesium',
    note: 'Magnesium is required to convert D3 into its active form. You\'re getting 82% of Mg DV, which supports your high D3 dose. ✓',
    status: 'active',
  },
  {
    pair: 'Iron + Vitamin C',
    note: 'You take Iron at Wake+30 with Vitamin C 500mg. C converts Fe³⁺ to Fe²⁺ (2–3× better absorption). Well-designed timing. ✓',
    status: 'active',
  },
  {
    pair: 'D3 + K2 (Missing K2)',
    note: 'D3 increases intestinal calcium absorption. K2 (MK-7) is needed to activate osteocalcin and matrix Gla-protein, directing calcium to bones and away from arteries. Currently unbalanced — add K2.',
    status: 'missing',
  },
  {
    pair: 'Magnesium + Sleep',
    note: 'Combined 82% DV magnesium (344mg across Glycinate + L-Threonate) taken at dinner supports GABA, melatonin synthesis, and sleep quality. Excellent timing. ✓',
    status: 'active',
  },
]

export default function Gaps() {
  const { supplements, loading, aggregateNutrients } = useSupplements()
  const { prefs, setPref } = usePreferences({ gaps_acknowledged: {} })
  const acknowledged = prefs.gaps_acknowledged || {}

  const [acknowledging, setAcknowledging] = useState(null)
  const [noteInput, setNoteInput] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      Analyzing gaps…
    </div>
  )

  const nutrientTotals = aggregateNutrients()
  const covered = KEY_NUTRIENTS.filter(n => (nutrientTotals[n] || 0) >= 50).length
  const coveragePct = Math.round((covered / KEY_NUTRIENTS.length) * 100)

  function doAcknowledge(name) {
    const next = { ...acknowledged, [name]: { note: noteInput.trim(), ts: new Date().toISOString() } }
    setPref('gaps_acknowledged', next)
    setAcknowledging(null)
    setNoteInput('')
  }

  function undoAcknowledge(name) {
    const next = { ...acknowledged }
    delete next[name]
    setPref('gaps_acknowledged', next)
  }

  function startAcknowledge(name) {
    setAcknowledging(name)
    setNoteInput('')
  }

  function cancelAcknowledge() {
    setAcknowledging(null)
    setNoteInput('')
  }

  const activeGaps  = CRITICAL_GAPS.filter(g => !acknowledged[g.name])
  const activeFlags = MONITOR_FLAGS.filter(f => !acknowledged[f.name])
  const allAcknowledged = [
    ...CRITICAL_GAPS.filter(g => acknowledged[g.name]).map(g => ({ ...g, type: 'gap' })),
    ...MONITOR_FLAGS.filter(f => acknowledged[f.name]).map(f => ({ ...f, type: 'flag' })),
  ]

  function AcknowledgeInline({ name }) {
    if (acknowledging !== name) return null
    return (
      <div style={{ marginTop: 10 }}>
        <input
          placeholder="Optional note (e.g. 'Reviewing with doctor')"
          value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doAcknowledge(name); if (e.key === 'Escape') cancelAcknowledge() }}
          autoFocus
          style={{ fontSize: 12, padding: '7px 10px', marginBottom: 7 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => doAcknowledge(name)}>Confirm</button>
          <button className="btn btn-ghost btn-sm" onClick={cancelAcknowledge}>Cancel</button>
        </div>
      </div>
    )
  }

  function AcknowledgeBtn({ name }) {
    if (acknowledging === name) return null
    return (
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 8, fontSize: 11, padding: '4px 10px', gap: 4, color: 'var(--text-light)' }}
        onClick={() => startAcknowledge(name)}
      >
        <CheckCircle size={11} /> Acknowledge
      </button>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Gap Analysis</div>
        <div className="page-subtitle">What your stack is missing, and what's working</div>
      </div>

      {/* Coverage score */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <ScoreGauge pct={coveragePct} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Stack Coverage Score</div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            {covered} of {KEY_NUTRIENTS.length} key nutrients at ≥50% DV.<br />
            {activeGaps.length} critical gap{activeGaps.length !== 1 ? 's' : ''} identified.
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span className="badge badge-red">{activeGaps.length} Gaps</span>
            <span className="badge badge-yellow">{activeFlags.length} Flags</span>
            <span className="badge badge-green">4 Synergies</span>
            {allAcknowledged.length > 0 && (
              <span className="badge badge-gray">{allAcknowledged.length} Acknowledged</span>
            )}
          </div>
        </div>
      </div>

      {/* Critical gaps */}
      <div className="gap-section">
        <div className="gap-section-title" style={{ color: '#991b1b' }}>
          <XCircle size={14} color="#ef4444" />
          Critical Gaps
        </div>

        {activeGaps.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0 2px' }}>All gaps acknowledged.</div>
        ) : activeGaps.map(g => (
          <div key={g.name} className="gap-card" style={{ borderLeftColor: '#ef4444' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} color="#ef4444" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="gap-card-name" style={{ color: '#991b1b' }}>{g.name}</div>
                <span className="badge badge-red">{g.dv === null ? 'Missing' : `${g.dv}% DV`}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>Recommended: {g.rec}</div>
              <div className="gap-card-desc">{g.note}</div>
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff7ed', borderRadius: 7, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                <strong>Suggestion:</strong> {g.suggestion}
              </div>
              <AcknowledgeInline name={g.name} />
              <AcknowledgeBtn name={g.name} />
            </div>
          </div>
        ))}
      </div>

      {/* Monitor flags */}
      <div className="gap-section">
        <div className="gap-section-title" style={{ color: '#92400e' }}>
          <TrendingUp size={14} color="#f59e0b" />
          Monitor Flags
        </div>

        {activeFlags.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0 2px' }}>All flags acknowledged.</div>
        ) : activeFlags.map(f => (
          <div key={f.name} className="gap-card" style={{ borderLeftColor: f.status === 'warn' ? '#f59e0b' : '#3b82f6' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: f.status === 'warn' ? '#fffbeb' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              {f.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="gap-card-name">{f.name}</div>
                <span className={`badge ${f.status === 'warn' ? 'badge-yellow' : 'badge-blue'}`}>{f.dv}% DV</span>
              </div>
              <div className="gap-card-desc" style={{ marginTop: 4 }}>{f.note}</div>
              <AcknowledgeInline name={f.name} />
              <AcknowledgeBtn name={f.name} />
            </div>
          </div>
        ))}
      </div>

      {/* Synergies */}
      <div className="gap-section">
        <div className="gap-section-title" style={{ color: '#14532d' }}>
          <Zap size={14} color="#22c55e" />
          Synergies &amp; Interactions
        </div>

        {SYNERGIES.map(s => (
          <div key={s.pair} className="gap-card" style={{ borderLeftColor: s.status === 'active' ? '#22c55e' : '#f59e0b' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.status === 'active' ? '#f0fdf4' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.status === 'active'
                ? <CheckCircle size={16} color="#22c55e" />
                : <AlertTriangle size={16} color="#f59e0b" />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="gap-card-name" style={{ fontSize: 13 }}>{s.pair}</div>
                <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                  {s.status === 'active' ? 'Active' : 'Incomplete'}
                </span>
              </div>
              <div className="gap-card-desc" style={{ marginTop: 4 }}>{s.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Acknowledged section */}
      {allAcknowledged.length > 0 && (
        <div className="gap-section">
          <button
            onClick={() => setShowAcknowledged(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', fontFamily: 'inherit', width: '100%',
            }}
          >
            <span className="gap-section-title" style={{ color: 'var(--text-light)', marginBottom: 0, flex: 1, justifyContent: 'flex-start' }}>
              <CheckCircle size={14} color="var(--text-light)" />
              Acknowledged ({allAcknowledged.length})
            </span>
            {showAcknowledged ? <ChevronUp size={14} color="var(--text-light)" /> : <ChevronDown size={14} color="var(--text-light)" />}
          </button>

          {showAcknowledged && (
            <div style={{ marginTop: 4 }}>
              {allAcknowledged.map(item => (
                <div key={item.name} className="gap-card" style={{ borderLeftColor: 'var(--border)', opacity: 0.7 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={16} color="var(--text-light)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div className="gap-card-name" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.name}</div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                        onClick={() => undoAcknowledge(item.name)}
                      >
                        Undo
                      </button>
                    </div>
                    {acknowledged[item.name]?.note && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                        "{acknowledged[item.name].note}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="alert alert-success" style={{ marginTop: 4 }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12 }}>
          This analysis is informational only. Consult a healthcare provider before adding or changing supplements, especially with Rx medications like Wegovy.
        </span>
      </div>
    </div>
  )
}
