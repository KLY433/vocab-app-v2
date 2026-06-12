import { useState, useEffect } from 'react'
import { useAuthContext } from '../lib/context'
import { useWords } from '../hooks/useWords'
import { useWrongAnswers } from '../hooks/useWrongAnswers'
import { supabase } from '../supabase/client'
import { PageHeader } from '../components/common/UI'

export default function StatsPage() {
  const { user } = useAuthContext()
  const { words, dueWords } = useWords(user?.id)
  const { wrongAnswers } = useWrongAnswers(user?.id)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('test_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setSessions(data ?? []))
  }, [user])

  const totalReviews = words.reduce((s, w) => s + w.review_count, 0)
  const totalCorrect = words.reduce((s, w) => s + w.correct_count, 0)
  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((s, sess) => s + (sess.score / sess.total * 100), 0) / sessions.length)
    : 0

  // Freq distribution
  const freqDist = [0, 1, 2, 3, 4, 5].map(n => ({
    label: n === 0 ? '미설정' : '★'.repeat(n),
    count: words.filter(w => w.suneung_freq === n).length,
  }))

  const statCards = [
    { label: '전체 단어', value: words.length, icon: '📝', color: 'var(--accent)' },
    { label: '오늘 복습', value: dueWords.length, icon: '🔔', color: 'var(--orange)' },
    { label: '총 복습 횟수', value: totalReviews, icon: '🔄', color: 'var(--green)' },
    { label: '전체 정답률', value: `${accuracy}%`, icon: '🎯', color: accuracy >= 70 ? 'var(--green)' : accuracy >= 40 ? 'var(--yellow)' : 'var(--red)' },
    { label: '테스트 횟수', value: sessions.length, icon: '🧪', color: 'var(--accent)' },
    { label: '평균 점수', value: `${avgScore}%`, icon: '📊', color: 'var(--yellow)' },
    { label: '누적 오답', value: wrongAnswers.length, icon: '❌', color: 'var(--red)' },
  ]

  return (
    <div>
      <PageHeader title="📊 학습 통계" />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Freq Distribution */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>수능 빈출도 분포</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {freqDist.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 60, fontSize: 13, color: 'var(--text-1)', flexShrink: 0 }}>{item.label}</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: words.length ? `${(item.count / words.length) * 100}%` : '0%',
                    background: item.label === '미설정' ? 'var(--bg-3)' : 'var(--accent)',
                  }}
                />
              </div>
              <span style={{ width: 30, textAlign: 'right', fontSize: 13, color: 'var(--text-1)', flexShrink: 0 }}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>최근 테스트 기록</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>모드</th>
                  <th>점수</th>
                  <th>정답률</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const pct = Math.round((s.score / s.total) * 100)
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-1)', fontSize: 13 }}>
                        {new Date(s.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td>
                        <span className="tag">{s.mode === 'multiple_choice' ? '객관식' : s.mode === 'fill_blank' ? '빈칸' : '플래시카드'}</span>
                      </td>
                      <td>{s.score} / {s.total}</td>
                      <td style={{ color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                        {pct}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
