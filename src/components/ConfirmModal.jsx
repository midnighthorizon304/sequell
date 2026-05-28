import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ title, message, confirmLabel = 'Remove', onConfirm, onCancel }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'white',
        borderRadius: '20px 20px 0 0',
        padding: '8px 20px 36px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        animation: 'slideUp 0.22s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* drag handle */}
        <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '8px auto 20px' }} />

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--danger-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>{message}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-full" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
