import { useAuthContext, useToast } from '../lib/context'
import { useWrongAnswers } from '../hooks/useWrongAnswers'
import { Empty, PageHeader, FreqStars, Confirm } from '../components/common/UI'
import { useState } from 'react'

export default function WrongPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { grouped, loading, clearWordWrongs } = useWrongAnswers(user?.id)
  const [clearing, setClearing] = useState(null)

  // Sort by wrong count descending
  const sorted = [...grouped].sort((a, b) => b.count - a.count)

  return (
    <div>
      <PageHeader
        title="❌ 오답노트"
        subtitle={`총 ${grouped.length}개 단어에서 오답 발생`}
      />

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : sorted.length === 0 ? (
        <Empty
          icon="🎉"
          title="오답이 없습니다!"
          desc="테스트를 진행하면 틀린 단어가 여기에 기록됩니다"
        />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map(item => (
            <div key={item.word_id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>{item.word}</span>
                    <span className="badge badge-red">{item.count}회 오답</span>
                    {item.suneung_freq > 0 && <FreqStars value={item.suneung_freq} />}
                  </div>
                  <p style={{ color: 'var(--text-1)', fontSize: 14 }}>{item.meaning}</p>
                  {item.example && (
                    <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
                      {item.example}
                    </p>
                  )}
                  {item.entries.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.entries.slice(-3).map((e, i) => (
                        <span key={i} className="tag" style={{ fontSize: 11 }}>
                          입력: "{e.user_answer || '(빈칸)'}" — {new Date(e.tested_at).toLocaleDateString('ko-KR')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setClearing(item)}
                >
                  ✓ 해결
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Confirm
        open={!!clearing}
        onClose={() => setClearing(null)}
        title="오답 해결 처리"
        message={`"${clearing?.word}" 오답 기록을 모두 삭제할까요?`}
        onConfirm={async () => {
          const { error } = await clearWordWrongs(clearing.word_id)
          if (error) toast(error.message, 'error')
          else toast('오답이 해결 처리되었습니다', 'success')
        }}
      />
    </div>
  )
}
