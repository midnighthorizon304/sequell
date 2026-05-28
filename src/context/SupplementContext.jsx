import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_SUPPLEMENTS } from '../lib/defaultData'

const SupplementContext = createContext(null)

// Supabase may return text[] columns as JSON strings depending on column type.
// Normalize all array fields so components always get real JS arrays.
function parseArr(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val) { try { return JSON.parse(val) } catch (_) {} }
  return []
}
function normalizeSupp(row) {
  return {
    ...row,
    timing:            parseArr(row.timing),
    nutrients:         parseArr(row.nutrients),
    other_ingredients: parseArr(row.other_ingredients),
  }
}

export function SupplementProvider({ children }) {
  const [supplements, setSupplements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSupplements()
  }, [])

  async function loadSupplements() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('supplements')
        .select('*')
        .order('created_at')
      if (err) throw err
      if (!data || data.length === 0) {
        await seedSupplements()
      } else {
        setSupplements(data.map(normalizeSupp))
      }
    } catch (err) {
      console.warn('Supabase unavailable, using local data:', err.message)
      setError(err.message)
      setSupplements(DEFAULT_SUPPLEMENTS.map((s, i) => ({ ...s, id: String(i + 1), created_at: new Date().toISOString() })))
    } finally {
      setLoading(false)
    }
  }

  async function seedSupplements() {
    try {
      // Strip any fields not present in the DB schema (e.g. active was removed)
      const rows = DEFAULT_SUPPLEMENTS.map(({ active: _a, ...rest }) => rest)
      const { data, error: err } = await supabase
        .from('supplements')
        .insert(rows)
        .select()
      if (err) throw err
      setSupplements(data.map(normalizeSupp))
    } catch (err) {
      console.warn('Seed failed, using local data:', err.message)
      setSupplements(DEFAULT_SUPPLEMENTS.map((s, i) => ({ ...s, id: String(i + 1), created_at: new Date().toISOString() })))
    }
  }

  async function addSupplement(supplement) {
    try {
      const { data, error: err } = await supabase
        .from('supplements')
        .insert([supplement])
        .select()
        .single()
      if (err) throw err
      const normalized = normalizeSupp(data)
      setSupplements(prev => [...prev, normalized])
      return { data: normalized, error: null }
    } catch (err) {
      const fallback = { ...supplement, id: String(Date.now()), created_at: new Date().toISOString() }
      setSupplements(prev => [...prev, fallback])
      return { data: fallback, error: null }
    }
  }

  async function deleteSupplement(id) {
    setSupplements(prev => prev.filter(s => s.id !== id))
    try {
      await supabase.from('supplements').delete().eq('id', id)
    } catch (_) {}
  }

  function aggregateNutrients() {
    const totals = {}
    supplements.forEach(supp => {
      const mult = supp.dose_multiplier || 1
      ;(supp.nutrients || []).forEach(n => {
        if (n.dv_percent != null) {
          totals[n.name] = (totals[n.name] || 0) + Math.round(n.dv_percent * mult)
        }
      })
    })
    return totals
  }

  return (
    <SupplementContext.Provider value={{
      supplements,
      loading,
      error,
      addSupplement,
      deleteSupplement,
      reload: loadSupplements,
      aggregateNutrients,
    }}>
      {children}
    </SupplementContext.Provider>
  )
}

export function useSupplements() {
  return useContext(SupplementContext)
}
