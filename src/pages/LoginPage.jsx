import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext, useToast } from '../lib/context'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp } = useAuthContext()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn({ email, password })
        if (error) { setError(error.message); return }
        toast('환영합니다!', 'success')
        navigate('/vocab')
      } else {
        if (!username.trim()) { setError('사용자 이름을 입력하세요.'); return }
        const { error } = await signUp({ email, password, username: username.trim() })
        if (error) { setError(error.message); return }
        toast('회원가입이 완료되었습니다. 이메일을 확인하세요.', 'success')
        setMode('login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>⚡</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>VocabMaster</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 6, fontSize: 14 }}>수능 영어 단어장 + 지문 학습</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 4, background: 'var(--bg-2)',
            borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 28,
          }}>
            {[['login', '로그인'], ['signup', '회원가입']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, fontSize: 14, transition: 'all .15s',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-1)',
                }}
              >{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">사용자 이름</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="예: student123"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="최소 6자"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                color: 'var(--red)', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 44, fontSize: 15 }}
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {mode === 'signup' && (
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
              관리자 계정은 사용자 이름을 <code style={{ color: 'var(--accent)' }}>vocabmanager</code>로 설정하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
