import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts'
import { Activity, Pill, TrendingUp, AlertTriangle } from 'lucide-react'
import { useSupplements } from '../context/SupplementContext'
import { CATEGORY_COLORS, KEY_NUTRIENTS } from '../lib/defaultData'

const TIMING_LABELS = {
  wake:          'On Waking',
  wake_30:       'Wake +30',
  first_meal:    'First Meal',
  between_meals: 'Between Meals',
  evening:       'Evening',
  bedtime:       'Bedtime',
}

const CHART_VIEWS = [
  { value: 'nutrients', label: '% DV by Nutrient' },
  { value: 'category',  label: '% DV by Category' },
  { value: 'timing',    label: '% DV by Timing' },
  { value: 'intake',    label: 'Supplement Contribution' },
  { value: 'gaps',      label: 'Coverage Gaps' },
]

const CHART_TITLES = {
  nutrients: '% Daily Value by Nutrient',
  category:  '% Daily Value by Category',
  timing:    '% Daily Value by Timing Slot',
  intake:    'Contribution by Supplement',
  gaps:      'Coverage Gaps (< 100% DV)',
}

function dvColor(dv) {
  if (!dv || dv === 0) return '#ef4444'
  if (dv < 50) return '#f59e0b'
  if (dv < 100) return '#84cc16'
  if (dv <= 200) return '#1a6b4a'
  return '#f97316'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{label}</p>
      <p style={{ color: dvColor(payload[0].value) }}>{payload[0].value}% DV</p>
    </div>
  )
}

export default function Dashboard() {
  const { supplements, loading, aggregateNutrients } = useSupplements()
  const [chartView, setChartView] = useState('nutrients')

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      Loading your stack…
    </div>
  )

  const nutrientTotals = aggregateNutrients()

  // % DV by Nutrient
  const nutrientsData = KEY_NUTRIENTS
    .map(n => ({ nutrient: n, dv: nutrientTotals[n] || 0 }))
    .filter(n => n.dv > 0)
    .sort((a, b) => b.dv - a.dv)

  // % DV by Category
  const catDVMap = {}
  supplements.forEach(supp => {
    const mult = supp.dose_multiplier || 1
    ;(supp.nutrients || []).forEach(n => {
      if (n.dv_percent != null) {
        catDVMap[supp.category] = (catDVMap[supp.category] || 0) + Math.round(n.dv_percent * mult)
      }
    })
  })
  const categoryData = Object.entries(catDVMap)
    .map(([cat, dv]) => ({ nutrient: cat, dv, color: CATEGORY_COLORS[cat] || '#94a3b8' }))
    .sort((a, b) => b.dv - a.dv)

  // % DV by Timing
  const timingDVMap = {}
  supplements.forEach(supp => {
    const mult = supp.dose_multiplier || 1
    const totalDV = (supp.nutrients || []).reduce((sum, n) =>
      n.dv_percent != null ? sum + Math.round(n.dv_percent * mult) : sum, 0)
    ;(supp.timing || []).forEach(t => {
      timingDVMap[t] = (timingDVMap[t] || 0) + totalDV
    })
  })
  const timingData = Object.entries(timingDVMap)
    .map(([t, dv]) => ({ nutrient: TIMING_LABELS[t] || t, dv }))
    .sort((a, b) => b.dv - a.dv)

  // Supplement Contribution
  const intakeData = supplements
    .map(supp => {
      const mult = supp.dose_multiplier || 1
      const totalDV = (supp.nutrients || []).reduce((sum, n) =>
        n.dv_percent != null ? sum + Math.round(n.dv_percent * mult) : sum, 0)
      return { nutrient: supp.name, dv: totalDV, color: CATEGORY_COLORS[supp.category] || '#94a3b8' }
    })
    .sort((a, b) => b.dv - a.dv)

  // Coverage Gaps
  const gapsData = KEY_NUTRIENTS
    .map(n => ({ nutrient: n, dv: nutrientTotals[n] || 0 }))
    .filter(n => n.dv < 100)
    .sort((a, b) => a.dv - b.dv)

  const dataMap = { nutrients: nutrientsData, category: categoryData, timing: timingData, intake: intakeData, gaps: gapsData }
  const activeData = dataMap[chartView] || nutrientsData

  const trackedWithDv = Object.values(nutrientTotals).filter(v => v > 0).length
  const covered = KEY_NUTRIENTS.filter(n => (nutrientTotals[n] || 0) >= 50).length
  const coveragePct = Math.round((covered / KEY_NUTRIENTS.length) * 100)
  const gapCount = KEY_NUTRIENTS.filter(n => (nutrientTotals[n] || 0) < 50).length

  const maxDV = activeData.length ? Math.max(...activeData.map(d => d.dv)) : 100
  const domainMax = (chartView === 'intake' || chartView === 'category' || chartView === 'timing')
    ? Math.max(100, Math.ceil(maxDV / 100) * 100 + 100)
    : Math.max(800, Math.ceil(maxDV / 100) * 100)

  const yAxisWidth = chartView === 'intake' ? 148 : 120

  const showDvLegend = chartView === 'nutrients' || chartView === 'gaps'
  const showRefLine  = chartView === 'nutrients' || chartView === 'gaps'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">{today}</div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#e8f4ef' }}>
            <Pill size={16} color="#1a6b4a" />
          </div>
          <div className="metric-value">{supplements.length}</div>
          <div className="metric-label">Supplements</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#eff6ff' }}>
            <Activity size={16} color="#3b82f6" />
          </div>
          <div className="metric-value">{trackedWithDv}</div>
          <div className="metric-label">Nutrients Tracked</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#f0fdf4' }}>
            <TrendingUp size={16} color="#22c55e" />
          </div>
          <div className="metric-value">{coveragePct}%</div>
          <div className="metric-label">Key Coverage</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#fef2f2' }}>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div className="metric-value">{gapCount}</div>
          <div className="metric-label">Coverage Gaps</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{CHART_TITLES[chartView]}</div>
          <select
            value={chartView}
            onChange={e => setChartView(e.target.value)}
            style={{
              fontSize: 11, padding: '5px 8px', borderRadius: 6,
              border: '1.5px solid var(--border)', background: 'white',
              color: 'var(--text-muted)', fontFamily: 'inherit',
              cursor: 'pointer', flexShrink: 0, width: 'auto',
            }}
          >
            {CHART_VIEWS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        {activeData.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <span style={{ fontSize: 13 }}>No data for this view yet</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={activeData.length * 30 + 24}>
            <BarChart data={activeData} layout="vertical" margin={{ left: 0, right: 44, top: 0, bottom: 0 }}>
              <XAxis
                type="number"
                domain={[0, domainMax]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nutrient"
                width={yAxisWidth}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              {showRefLine && (
                <ReferenceLine x={100} stroke="#1a6b4a" strokeDasharray="4 2" strokeWidth={1.5} />
              )}
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="dv" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {activeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color || dvColor(entry.dv)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {showDvLegend && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {[['#1a6b4a','100–200%'],['#f97316','200%+'],['#84cc16','50–99%'],['#f59e0b','<50%'],['#ef4444','0%']].map(([c,l]) => (
              <span key={l} style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#64748b' }}>
                <span style={{ width:8,height:8,borderRadius:2,background:c,display:'inline-block' }} />{l}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
