import { useState } from 'react'
import { Clock, AlertTriangle, Sun, Moon, Pill, Timer } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'

// ── Time helpers ─────────────────────────────────────────────────────────────

function addMins(baseMinutes, offset) {
  const total = baseMinutes + offset
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function parseMinutes(time24) {
  const [h, m] = time24.split(':').map(Number)
  return h * 60 + m
}

// ── Schedule builders ─────────────────────────────────────────────────────────

const WEGOVY = (wakeTime) => ({
  time: wakeTime, label: 'Wake',
  items: ['Wegovy oral 1.5mg'],
  note: 'Empty stomach — no food, water, or supplements for 30 min',
  type: 'rx', warning: true,
})

const IRON = (wakeMin) => ({
  time: addMins(wakeMin, 30), label: 'Wake + 30 min',
  items: ['Thorne Iron Bisglycinate 25mg', 'Vitamin C 500mg'],
  note: 'Empty stomach · Wegovy lockout window now clear',
  type: 'normal',
})

const FAT_SOLUBLES = (time, label, note) => ({
  time, label,
  items: ['Nature Made Multi For Him', 'Vitamin D3 2000 IU', 'Fish Oil 1200mg (2 softgels)'],
  note,
  type: 'meal',
})

const PROBIOTIC = (time) => ({
  time, label: 'Mid-Window',
  items: ['Probiotic-10 25B (1–2 caps)'],
  note: 'Between meals for best colonization',
  type: 'normal',
})

const EVENING = (time) => ({
  time, label: 'Dinner',
  items: ['Magnesium Glycinate 200mg (2 caps)', 'Neuro-Mag / Magnesium L-Threonate (3 caps)'],
  note: 'With dinner · supports sleep and cognition',
  type: 'normal',
})

function buildWeekdaySchedule(wakeTime, fastingEnabled, eatStart, eatEnd) {
  const wakeMin = parseMinutes(wakeTime)

  if (!fastingEnabled) {
    const breakfast = addMins(wakeMin, 60)
    return [
      WEGOVY(wakeTime),
      IRON(wakeMin),
      FAT_SOLUBLES(breakfast, 'Breakfast', 'Fat-solubles with first meal of the day'),
      PROBIOTIC(addMins(wakeMin, 180)),
      EVENING(addMins(wakeMin, 660)),
    ]
  }

  const eatStartMin = parseMinutes(eatStart)
  const eatEndMin   = parseMinutes(eatEnd)

  return [
    WEGOVY(wakeTime),
    IRON(wakeMin),
    FAT_SOLUBLES(eatStart, 'Eating Window Opens', 'First meal · fat-soluble vitamins with food'),
    PROBIOTIC(addMins(eatStartMin, 180)),
    EVENING(addMins(eatEndMin, -30)),
    {
      time: eatEnd, label: 'Eating Window Closes', items: [],
      note: `Fast begins — next eating at ${fmt12(eatStart)}`,
      type: 'fast',
    },
  ]
}

function buildWeekendSchedule(wakeTime) {
  const wakeMin = parseMinutes(wakeTime)
  return [
    WEGOVY(wakeTime),
    IRON(wakeMin),
    FAT_SOLUBLES(addMins(wakeMin, 60), 'Breakfast', 'Fat-solubles move to breakfast on weekends'),
    PROBIOTIC(addMins(wakeMin, 180)),
    EVENING(addMins(wakeMin, 660)),
  ]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS  = { rx: '#ef4444', meal: '#1a6b4a', fast: '#8b5cf6', normal: '#3b82f6' }
const TYPE_LABELS  = { rx: 'Rx', meal: 'Meal', fast: 'Fast', normal: '' }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const defaultMode = [0, 6].includes(new Date().getDay()) ? 'weekend' : 'weekday'
  const [mode, setMode] = useState(defaultMode)

  const { prefs, setPref } = usePreferences({
    fasting_enabled:    true,
    eat_window_start:   '11:30',
    eat_window_end:     '19:30',
    wake_time_weekday:  localStorage.getItem('sequell_wake') || '07:00',
    wake_time_weekend:  localStorage.getItem('sequell_wake') || '08:00',
  })

  const { fasting_enabled, eat_window_start, eat_window_end, wake_time_weekday, wake_time_weekend } = prefs
  const wakeTime = mode === 'weekday' ? wake_time_weekday : wake_time_weekend
  const showFastingWindow = mode === 'weekday' && fasting_enabled

  const schedule = mode === 'weekday'
    ? buildWeekdaySchedule(wakeTime, fasting_enabled, eat_window_start, eat_window_end)
    : buildWeekendSchedule(wakeTime)

  const nowMin    = new Date().getHours() * 60 + new Date().getMinutes()
  const nextIndex = schedule.findIndex(s => parseMinutes(s.time) > nowMin)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Schedule</div>
        <div className="page-subtitle">Your daily supplement protocol</div>
      </div>

      {/* Controls card */}
      <div className="card" style={{ marginBottom: 12 }}>

        {/* Row 1: protocol toggle */}
        <div>
          <label style={{ marginBottom: 5 }}>Protocol</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${mode === 'weekday' ? 'active' : ''}`} onClick={() => setMode('weekday')}>
              <Sun size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Weekday
            </button>
            <button className={`toggle-btn ${mode === 'weekend' ? 'active' : ''}`} onClick={() => setMode('weekend')}>
              <Moon size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Weekend
            </button>
          </div>
        </div>

        {/* Row 2: wake times */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sun size={11} color="var(--text-muted)" /> Weekday wake
            </label>
            <input type="time" value={wake_time_weekday} onChange={e => setPref('wake_time_weekday', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Moon size={11} color="var(--text-muted)" /> Weekend wake
            </label>
            <input type="time" value={wake_time_weekend} onChange={e => setPref('wake_time_weekend', e.target.value)} />
          </div>
        </div>

        <div className="divider" style={{ margin: '14px 0' }} />

        {/* Row 2: fasting toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Timer size={14} color="var(--brand)" /> Intermittent Fasting
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {fasting_enabled ? 'Eating window active' : 'No eating window restriction'}
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => setPref('fasting_enabled', !fasting_enabled)}
            style={{
              width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 3,
              background: fasting_enabled ? 'var(--brand)' : '#cbd5e1',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center',
              justifyContent: fasting_enabled ? 'flex-end' : 'flex-start',
              flexShrink: 0,
            }}
            role="switch"
            aria-checked={fasting_enabled}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} />
          </button>
        </div>

        {/* Row 3: eating window times (weekday + fasting ON) */}
        {showFastingWindow && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>Window opens</label>
              <input
                type="time"
                value={eat_window_start}
                onChange={e => setPref('eat_window_start', e.target.value)}
              />
            </div>
            <div style={{ paddingBottom: 10, color: 'var(--text-muted)', fontSize: 18, fontWeight: 300 }}>→</div>
            <div style={{ flex: 1 }}>
              <label>Window closes</label>
              <input
                type="time"
                value={eat_window_end}
                onChange={e => setPref('eat_window_end', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Info banners */}
        {showFastingWindow && (
          <div className="alert alert-warn" style={{ marginTop: 12 }}>
            <Clock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {(() => {
                const h = parseMinutes(eat_window_end) - parseMinutes(eat_window_start)
                return `${Math.round(h / 60)}:${String(h % 60).padStart(2,'0')}h eating window · `
              })()}
              <strong>{fmt12(eat_window_start)} – {fmt12(eat_window_end)}</strong>
            </span>
          </div>
        )}

        {mode === 'weekday' && !fasting_enabled && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            <Sun size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>No fasting · fat-solubles move to breakfast (~1 hr after wake)</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="timeline">
        {schedule.map((slot, i) => {
          const isLast     = i === schedule.length - 1
          const isNextDose = i === nextIndex
          const color      = TYPE_COLORS[slot.type] || '#64748b'

          return (
            <div className="tl-row" key={i}>
              <div className="tl-spine">
                <div
                  className="tl-dot"
                  style={{
                    color,
                    background: isNextDose ? color : 'white',
                    boxShadow: isNextDose
                      ? `0 0 0 3px ${color}30, 0 0 0 2px ${color}`
                      : `0 0 0 2px ${color}`,
                  }}
                />
                {!isLast && <div className="tl-line" />}
              </div>

              <div className="tl-body">
                <div className="tl-time">
                  {fmt12(slot.time)}
                  {isNextDose && (
                    <span style={{ marginLeft: 7, fontSize: 10, background: color, color: 'white', borderRadius: 99, padding: '1px 7px', fontWeight: 600, verticalAlign: 'middle' }}>
                      NEXT
                    </span>
                  )}
                </div>

                <div className="tl-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{slot.label}</div>
                    {TYPE_LABELS[slot.type] && (
                      <span className="badge" style={{ background: color + '18', color, border: `1px solid ${color}40`, fontSize: 10, flexShrink: 0 }}>
                        {TYPE_LABELS[slot.type]}
                      </span>
                    )}
                  </div>

                  {slot.items.length > 0 && (
                    <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {slot.items.map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <Pill size={11} color={color} style={{ flexShrink: 0 }} />
                          <span style={{ color: '#0f172a' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {slot.note && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>{slot.note}</div>
                  )}

                  {slot.warning && (
                    <div className="alert alert-danger" style={{ marginTop: 8, padding: '8px 10px' }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        <strong>30-minute lockout</strong> — no food, water, or any other supplements until {fmt12(addMins(parseMinutes(slot.time), 30))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
