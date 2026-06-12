import { useState } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { useWords } from '../hooks/useWords'
import { Modal, FreqStars, Empty, Confirm, PageHeader } from '../components/common/UI'

export default function VocabPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { words, dueWords, loading, addWord, updateWord, deleteWord } = useWords(user?.id)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [filterFreq, setFilterFreq] = useState(0)

  const filtered = words.filter(w => {
    const q = search.toLowerCase()
    const matchQ = !q || w.word.toLowerCase().includes(q) || w.meaning.includes(q)
    const matchF = filterFreq === 0 || w.suneung_freq >= filterFreq
    return matchQ && matchF
  })

  return (
    <div>
      <PageHeader
        title="📝 단어장"
        subtitle={`${words.length}개 단어 · 오늘 복습 ${dueWords.length}개`}
        action={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + 단어 추가
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{ maxWidth: 280 }}
          placeholder="단어 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-1)' }}>빈출도:</span>
          {[0, 1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setFilterFreq(n)}
              className={`btn btn-ghost btn-sm ${filterFreq === n ? 'btn-primary' : ''}`}
              style={filterFreq === n ? { background: 'var(--accent)', color: '#fff' } : {}}
            >
              {n === 0 ? '전체' : '★'.repeat(n) + '+'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Empty icon="📖" title="단어가 없습니다" desc="+ 단어 추가 버튼으로 시작하세요"
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 단어 추가</button>}
        />
      ) : (
        <div className="table-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>단어</th>
                <th>뜻</th>
                <th>수능 빈출도</th>
                <th>복습</th>
                <th>정답률</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <WordRow key={w.id} word={w}
                  onEdit={() => setEditing(w)}
                  onDelete={() => setDeleting(w)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <WordModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (data) => {
          const { error } = await addWord(data)
          if (error) toast(error.message, 'error')
          else { toast('단어가 추가되었습니다', 'success'); setShowAdd(false) }
        }}
      />

      {/* Edit Modal */}
      <WordModal
        open={!!editing}
        word={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          const { error } = await updateWord(editing.id, data)
          if (error) toast(error.message, 'error')
          else { toast('수정되었습니다', 'success'); setEditing(null) }
        }}
      />

      {/* Delete Confirm */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="단어 삭제"
        message={`"${deleting?.word}"을(를) 삭제할까요? 오답노트도 함께 삭제됩니다.`}
        onConfirm={async () => {
          const { error } = await deleteWord(deleting.id)
          if (error) toast(error.message, 'error')
          else toast('삭제되었습니다', 'success')
        }}
      />
    </div>
  )
}

function WordRow({ word, onEdit, onDelete }) {
  const acc = word.review_count > 0
    ? Math.round((word.correct_count / word.review_count) * 100)
    : null
  const isDue = new Date(word.next_review) <= new Date()

  return (
    <tr>
      <td>
        <span style={{ fontWeight: 700 }}>{word.word}</span>
        {isDue && <span className="badge badge-orange" style={{ marginLeft: 8 }}>복습</span>}
      </td>
      <td style={{ color: 'var(--text-1)' }}>{word.meaning}</td>
      <td><FreqStars value={word.suneung_freq} /></td>
      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
        {word.review_count}회
      </td>
      <td>
        {acc !== null ? (
          <span style={{ color: acc >= 70 ? 'var(--green)' : acc >= 40 ? 'var(--yellow)' : 'var(--red)', fontWeight: 600 }}>
            {acc}%
          </span>
        ) : <span style={{ color: 'var(--text-2)' }}>-</span>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>수정</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>삭제</button>
        </div>
      </td>
    </tr>
  )
}

function WordModal({ open, onClose, onSave, word }) {
  const [form, setForm] = useState({
    word: word?.word ?? '',
    meaning: word?.meaning ?? '',
    example: word?.example ?? '',
    difficulty: word?.difficulty ?? 1,
    suneung_freq: word?.suneung_freq ?? 0,
  })
  const [saving, setSaving] = useState(false)

  // Reset when word changes
  useState(() => {
    setForm({
      word: word?.word ?? '',
      meaning: word?.meaning ?? '',
      example: word?.example ?? '',
      difficulty: word?.difficulty ?? 1,
      suneung_freq: word?.suneung_freq ?? 0,
    })
  }, [word])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.word.trim() || !form.meaning.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={word ? '단어 수정' : '단어 추가'}>
      <div className="form-group">
        <label className="form-label">단어 *</label>
        <input value={form.word} onChange={e => set('word', e.target.value)} placeholder="예: ephemeral" />
      </div>
      <div className="form-group">
        <label className="form-label">뜻 *</label>
        <input value={form.meaning} onChange={e => set('meaning', e.target.value)} placeholder="예: 덧없는, 일시적인" />
      </div>
      <div className="form-group">
        <label className="form-label">예문</label>
        <textarea
          rows={2}
          value={form.example}
          onChange={e => set('example', e.target.value)}
          placeholder="예문을 입력하세요"
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">수능 빈출도</label>
        <FreqStars value={form.suneung_freq} onChange={v => set('suneung_freq', v)} size={22} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.word || !form.meaning}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </Modal>
  )
}
