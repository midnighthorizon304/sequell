import { useState } from 'react'
import { Trash2, Pencil, ChevronDown, ChevronUp, Pill, AlertCircle, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSupplements } from '../context/SupplementContext'
import { TIMING_LABELS, CATEGORY_COLORS } from '../lib/defaultData'
import ConfirmModal from '../components/ConfirmModal'

function formatVerifiedDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dvColor(dv) {
  if (!dv || dv === 0) return '#ef4444'
  if (dv < 50)  return '#f59e0b'
  if (dv < 100) return '#84cc16'
  if (dv <= 200) return '#1a6b4a'
  return '#f97316'
}

function categoryBadgeStyle(category) {
  const color = CATEGORY_COLORS[category] || '#94a3b8'
  return { background: color + '18', color, border: `1px solid ${color}40` }
}

function SupplementCard({ supp, onDeleteRequest }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const mult        = supp.dose_multiplier || 1
  const hasNutrients = supp.nutrients?.length > 0
  const dvNutrients  = supp.nutrients?.filter(n => n.dv_percent != null) || []
  const hasExtras    = !!(supp.suggested_use || supp.cautions || supp.other_ingredients?.length)

  return (
    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 12px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{supp.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{supp.brand}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={() => navigate(`/edit/${supp.id}`)}
              title="Edit"
            >
              <Pencil size={14} color="#94a3b8" />
            </button>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={() => onDeleteRequest(supp.id, supp.name)}
              title="Remove"
            >
              <Trash2 size={14} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
          <span className="badge" style={categoryBadgeStyle(supp.category)}>{supp.category}</span>
          <span className="badge badge-gray">{supp.dose_per_serving}</span>
          {mult > 1 && (
            <span className="badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
              {mult}× dose
            </span>
          )}
          {(supp.timing || []).map(t => (
            <span key={t} className="badge badge-blue">{TIMING_LABELS[t] || t}</span>
          ))}
          {supp.verified ? (
            <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #6ee7b7', fontSize: 10 }}>
              Verified ✓ {formatVerifiedDate(supp.verified_at)}
            </span>
          ) : (
            <span className="badge" style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: 10 }}>
              AI Generated
            </span>
          )}
        </div>

        {/* Timing note */}
        {supp.timing_notes && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 7, lineHeight: 1.5 }}>{supp.timing_notes}</div>
        )}

        {/* DV bars */}
        {dvNutrients.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {dvNutrients.slice(0, expanded ? dvNutrients.length : 4).map(n => {
              const effectiveDv = Math.round(n.dv_percent * mult)
              const color = dvColor(effectiveDv)
              const barPct = Math.min(effectiveDv / 3, 100)
              return (
                <div key={n.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontSize: 11, color: '#64748b', width: 112, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.name}
                  </div>
                  <div className="prog-track" style={{ flex: 1, height: 5 }}>
                    <div className="prog-fill" style={{ width: `${barPct}%`, background: color, height: '100%' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color, width: 42, textAlign: 'right', flexShrink: 0 }}>
                    {mult > 1 ? (
                      <span title={`Label: ${n.dv_percent}%`}>{effectiveDv}%</span>
                    ) : `${n.dv_percent}%`}
                  </div>
                </div>
              )
            })}
            {!expanded && dvNutrients.length > 4 && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>+{dvNutrients.length - 4} more…</div>
            )}
            {mult > 1 && (
              <div style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>
                % DV shown at {mult}× dose · label dose: ÷{mult}
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        {(hasNutrients || hasExtras) && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 6, padding: '4px 0', gap: 4, fontSize: 12 }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Show less' : 'Full label details'}
          </button>
        )}

        {/* Expanded details */}
        {expanded && (
          <div style={{ marginTop: 10 }}>

            {/* All nutrients with full names */}
            {hasNutrients && (
              <div style={{ background: '#f8fafb', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Supplement Facts
                </div>
                {supp.nutrients.map((n, i) => {
                  const effectiveDv = n.dv_percent != null ? Math.round(n.dv_percent * mult) : null
                  const displayName = n.full_name || n.name
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f1f5f9', gap: 8 }}>
                        <span style={{ color: '#64748b', flex: 1 }}>{displayName}</span>
                        <span style={{ fontWeight: 600, color: '#0f172a', flexShrink: 0, textAlign: 'right' }}>
                          {n.amount}{n.unit}
                          {n.dv_percent != null && (
                            <span style={{ color: mult > 1 ? '#f97316' : '#94a3b8', fontWeight: mult > 1 ? 600 : 400 }}>
                              {' '}· {effectiveDv}% DV{mult > 1 && <span style={{ fontWeight: 400, color: '#94a3b8' }}> ({n.dv_percent}% label)</span>}
                            </span>
                          )}
                        </span>
                      </div>
                      {/* Probiotic strains */}
                      {Array.isArray(n.strains) && n.strains.length > 0 && (
                        <div style={{ paddingLeft: 12, paddingBottom: 4 }}>
                          {n.strains.map((s, j) => (
                            <div key={j} style={{ fontSize: 11, color: '#94a3b8', padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontStyle: 'italic' }}>{s.name}</span>
                              <span>{s.cfu}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Other / inactive ingredients */}
            {supp.other_ingredients?.length > 0 && (
              <div style={{ background: '#f8fafb', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Other Ingredients
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  {supp.other_ingredients.join(', ')}
                </div>
              </div>
            )}

            {/* Suggested use */}
            {supp.suggested_use && (
              <div style={{ display: 'flex', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
                <BookOpen size={13} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Suggested Use</div>
                  <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.55 }}>{supp.suggested_use}</div>
                </div>
              </div>
            )}

            {/* Cautions */}
            {supp.cautions && (
              <div style={{ display: 'flex', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 12px' }}>
                <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Cautions / Warnings</div>
                  <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>{supp.cautions}</div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

export default function Stack() {
  const { supplements, loading, deleteSupplement } = useSupplements()
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      Loading your stack…
    </div>
  )

  const totalNutrients = supplements.reduce((sum, s) => sum + (s.nutrients?.length || 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">My Stack</div>
        <div className="page-subtitle">{supplements.length} supplements · {totalNutrients} nutrients tracked</div>
      </div>

      {supplements.length === 0 ? (
        <div className="empty-state">
          <Pill size={40} style={{ opacity: 0.25 }} />
          <p>No supplements yet.</p>
          <p style={{ fontSize: 12 }}>Use the + tab to add your first one.</p>
        </div>
      ) : (
        supplements.map(s => (
          <SupplementCard
            key={s.id}
            supp={s}
            onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
          />
        ))
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove supplement?"
          message={`Are you sure you want to remove "${deleteTarget.name}" from your stack? This cannot be undone.`}
          confirmLabel="Remove"
          onConfirm={() => { deleteSupplement(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
