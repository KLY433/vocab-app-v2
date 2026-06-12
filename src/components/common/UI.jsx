import { useEffect } from 'react'

// ─── Modal ───────────────────────────────
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

// ─── FreqStars (수능 빈출도) ─────────────
export function FreqStars({ value = 0, onChange, size = 14 }) {
  return (
    <div className="freq-stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`freq-star${n <= value ? ' on' : ''}`}
          style={{ cursor: onChange ? 'pointer' : 'default' }}
          onClick={() => onChange?.(n === value ? 0 : n)}
        >★</span>
      ))}
    </div>
  )
}

// ─── Empty State ─────────────────────────
export function Empty({ icon = '📭', title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────
export function Confirm({ open, onClose, onConfirm, title, message }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ color: 'var(--text-1)', marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>취소</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onClose() }}>삭제</button>
      </div>
    </Modal>
  )
}

// ─── Page Header ─────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-1)', marginTop: 4, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
