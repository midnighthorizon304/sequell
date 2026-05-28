import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Activity, Pill, TrendingUp, Zap, AlertTriangle } from 'lucide-react'
import { useSupplements } from '../context/SupplementContext'
import { CATEGORY_COLORS, KEY_NUTRIENTS } from '../lib/defaultData'

function dvColor(dv) {
  if (!dv || dv === 0) return '#ef4444'
  if (dv < 50) return '#f59e0b'
  if (dv < 100) return '#84cc16'
  if (dv <= 200) return '#1a6b4a'
  return '#f97316'
}

function dvLabel(dv) {
  if (!dv || dv === 0) return 'badge-red'
  if (dv < 50) return 'badge-yellow'
  if (dv <= 200) return 'badge-green'
  return 'badge-yellow'
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

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      Loading your stack…
    </div>
  )

  const nutrientTotals = aggregateNutrients()

  const barData = KEY_NUTRIENTS
    .map(n => ({ nutrient: n, dv: nutrientTotals[n] || 0 }))
    .filter(n => n.dv > 0)
    .sort((a, b) => b.dv - a.dv)

  const categoryCounts = {}
  supplements.forEach(s => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1
  })
  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#94a3b8',
  }))

  const trackedWithDv = Object.values(nutrientTotals).filter(v => v > 0).length
  const covered = KEY_NUTRIENTS.filter(n => (nutrientTotals[n] || 0) >= 50).length
  const coveragePct = Math.round((covered / KEY_NUTRIENTS.length) * 100)

  const gaps = [
    { label: 'Potassium', dv: 0 },
    { label: 'Calcium', dv: nutrientTotals['Calcium'] || 0 },
    { label: 'Vitamin K2', dv: null },
  ]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">{today}</div>
      </div>

      {/* Metric cards */}
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
          <div className="metric-value">3</div>
          <div className="metric-label">Active Gaps</div>
        </div>
      </div>

      {/* Nutrient bar chart */}
      <div className="card">
        <div className="card-title">Nutrient Coverage (% DV)</div>
        <ResponsiveContainer width="100%" height={barData.length * 30 + 24}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ left: 0, right: 44, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, Math.max(800, Math.ceil(Math.max(...barData.map(d => d.dv)) / 100) * 100)]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="nutrient"
              width={120}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={100} stroke="#1a6b4a" strokeDasharray="4 2" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="dv" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={dvColor(entry.dv)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {[['#1a6b4a','100–200%'],['#f97316','200%+'],['#84cc16','50–99%'],['#f59e0b','<50%'],['#ef4444','0%']].map(([c,l]) => (
            <span key={l} style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#64748b' }}>
              <span style={{ width:8,height:8,borderRadius:2,background:c,display:'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Donut chart */}
      <div className="card">
        <div className="card-title">Stack by Category</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} supplement${value > 1 ? 's' : ''}`, name]} />
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gap analysis */}
      <div className="card">
        <div className="card-title">Gap Analysis</div>
        {gaps.map(g => (
          <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                {g.dv === null ? 'Not in stack' : g.dv === 0 ? 'No coverage' : `${g.dv}% DV only`}
              </div>
            </div>
            <span className={`badge ${g.dv === null || g.dv === 0 ? 'badge-red' : g.dv < 50 ? 'badge-yellow' : 'badge-green'}`}>
              {g.dv === null ? 'Missing' : `${g.dv}%`}
            </span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 12, color: '#64748b', display:'flex',alignItems:'center',gap:6 }}>
          <Zap size={12} color="#f59e0b" />
          See full analysis in the <strong style={{ color:'#1a6b4a' }}>Gaps</strong> tab
        </div>
      </div>
    </div>
  )
}
