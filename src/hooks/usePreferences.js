import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LS_PREFIX = 'sequell_pref_'

function readLocalPrefs(defaults) {
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (raw !== null) {
      try { result[key] = JSON.parse(raw) } catch (_) {}
    }
  }
  return result
}

export function usePreferences(defaults = {}) {
  const [prefs, setPrefs] = useState(() => readLocalPrefs(defaults))

  // Hydrate from Supabase on mount (non-blocking)
  useEffect(() => {
    const keys = Object.keys(defaults)
    if (!keys.length) return
    supabase
      .from('preferences')
      .select('key, value')
      .in('key', keys)
      .then(({ data }) => {
        if (!data?.length) return
        setPrefs(p => {
          const next = { ...p }
          data.forEach(row => {
            next[row.key] = row.value
            localStorage.setItem(LS_PREFIX + row.key, JSON.stringify(row.value))
          })
          return next
        })
      })
      .catch(() => {}) // Supabase table may not exist yet — fall back to localStorage silently
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setPref = useCallback(async (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }))
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
    try {
      await supabase
        .from('preferences')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    } catch (_) {}
  }, [])

  return { prefs, setPref }
}
