import { useState, useEffect, useCallback } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { supabase } from '../supabase/client'
import { PageHeader, Confirm, Empty } from '../components/common/UI'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const { isAdmin } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdmin) navigate('/vocab')
  }, [isAdmin, navigate])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userWords, setUserWords] = useState([])
  const [userPassages, setUserPassages] = useState([])
  const [detailTab, setDetailTab] = useState('words')
  const [deleting, setDeleting] = useState(null)
  const toast = useToast()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const fetchUserDetail = useCallback(async (userId) => {
    const [{ data: words }, { data: passages }] = await Promise.all([
      supabase.from('words').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('passages').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    setUserWords(words ?? [])
    setUserPassages(passages ?? [])
  }, [])

  const handleSelectUser = (u) => {
    setSelectedUser(u)
    fetchUserDetail(u.id)
    setDetailTab('words')
  }

  const handleDeleteUser = async (userId) => {
    // Supabase cascade deletes will handle dependent rows
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      // Fallback: delete profile (cascade will handle the rest via RLS + foreign keys)
      const { error: e2 } = await supabase.from('profiles').delete().eq('id', userId)
      if (e2) { toast(e2.message, 'error'); return }
    }
    toast('사용자가 삭제되었습니다', 'success')
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (selectedUser?.id === userId) setSelectedUser(null)
  }

  if (!isAdmin) return null

  return (
    <div>
      <PageHeader title="🛡️ 관리자" subtitle="전체 사용자 관리" />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* User List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
            사용자 목록 ({users.length}명)
          </div>
          {loading ? (
            <div className="loading-center" style={{ minHeight: 80 }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <Empty icon="👤" title="사용자 없음" />
          ) : (
            <div>
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    background: selectedUser?.id === u.id ? 'var(--bg-3)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background .1s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.role === 'admin' && <span className="badge badge-accent">ADMIN</span>}
                    {u.role !== 'admin' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={e => { e.stopPropagation(); setDeleting(u) }}
                      >삭제</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Detail */}
        <div>
          {!selectedUser ? (
            <div className="card">
              <Empty icon="👈" title="사용자를 선택하세요" desc="왼쪽 목록에서 사용자를 클릭하면 상세 정보를 볼 수 있습니다" />
            </div>
          ) : (
            <div>
              {/* User Info */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 18,
                  }}>
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedUser.username}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      가입일: {new Date(selectedUser.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <div className="card" style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{userWords.length}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>단어</div>
                    </div>
                    <div className="card" style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{userPassages.length}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>지문</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, width: 'fit-content' }}>
                {[['words', '단어장'], ['passages', '지문']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setDetailTab(tab)} style={{
                    padding: '7px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13,
                    background: detailTab === tab ? 'var(--accent)' : 'transparent',
                    color: detailTab === tab ? '#fff' : 'var(--text-1)', transition: 'all .15s',
                  }}>{label}</button>
                ))}
              </div>

              {/* Content */}
              {detailTab === 'words' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {userWords.length === 0 ? (
                    <Empty icon="📭" title="단어 없음" />
                  ) : (
                    <table>
                      <thead><tr><th>단어</th><th>뜻</th><th>복습</th><th>정답률</th></tr></thead>
                      <tbody>
                        {userWords.map(w => (
                          <tr key={w.id}>
                            <td style={{ fontWeight: 700 }}>{w.word}</td>
                            <td style={{ color: 'var(--text-1)' }}>{w.meaning}</td>
                            <td>{w.review_count}회</td>
                            <td>{w.review_count > 0 ? `${Math.round(w.correct_count / w.review_count * 100)}%` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {detailTab === 'passages' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {userPassages.length === 0 ? (
                    <div className="card"><Empty icon="📭" title="지문 없음" /></div>
                  ) : userPassages.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{p.content.slice(0, 100)}...</div>
                      {p.translation && <span className="badge badge-green" style={{ marginTop: 8 }}>번역 있음</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="사용자 삭제"
        message={`"${deleting?.username}" 사용자를 삭제할까요? 모든 단어와 지문도 함께 삭제됩니다.`}
        onConfirm={() => handleDeleteUser(deleting.id)}
      />
    </div>
  )
}
