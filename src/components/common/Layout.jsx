import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthContext, useToast } from '../../lib/context'
import { useState } from 'react'

const NAV = [
  { to: '/library',  icon: '📚', label: '지문 라이브러리' },
  { to: '/vocab',    icon: '📝', label: '단어장' },
  { to: '/test',     icon: '🧪', label: '테스트' },
  { to: '/wrong',    icon: '❌', label: '오답노트' },
  { to: '/stats',    icon: '📊', label: '통계' },
]

export default function Layout({ children }) {
  const { profile, signOut, isAdmin } = useAuthContext()
  const toast = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast('로그아웃 되었습니다.', 'info')
    navigate('/login')
  }

  const navItems = isAdmin ? [...NAV, { to: '/admin', icon: '🛡️', label: '관리자' }] : NAV

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>
      {/* Mobile header */}
      <header style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--header-h)',
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 100,
      }} className="mobile-header">
        <span style={{ fontWeight: 700, fontSize: 16 }}>⚡ VocabMaster</span>
        <button onClick={() => setMobileOpen(o => !o)} className="btn btn-ghost btn-sm">☰</button>
      </header>

      {/* Sidebar */}
      <aside style={{
        width: 'var(--nav-w)', minWidth: 220, flexShrink: 0,
        background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>⚡ VocabMaster</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>v2.0</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                marginBottom: 2, fontSize: 14, fontWeight: 500,
                color: isActive ? 'var(--text-0)' : 'var(--text-1)',
                background: isActive ? 'var(--bg-3)' : 'transparent',
                transition: 'all .15s',
                textDecoration: 'none',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {profile?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.username ?? '로딩 중...'}
              </div>
              {isAdmin && <span className="badge badge-accent" style={{ fontSize: 10 }}>ADMIN</span>}
            </div>
          </div>
          <button onClick={handleSignOut} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
            zIndex: 99, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
          aside { 
            position: fixed !important; left: ${mobileOpen ? '0' : '-220px'} !important;
            z-index: 100; transition: left .25s ease;
            top: var(--header-h) !important;
            height: calc(100vh - var(--header-h)) !important;
          }
          .mobile-overlay { display: block !important; }
          main { padding: calc(var(--header-h) + 16px) 16px 16px !important; }
        }
      `}</style>
    </div>
  )
}
