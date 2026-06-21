import { useEffect, useState } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { useWords } from '../hooks/useWords'
import { Modal, Empty, Confirm, PageHeader } from '../components/common/UI'

export default function VocabPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { words, dueWords, loading, addWord, updateWord, deleteWord } = useWords(user?.id)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = words.filter(word => {
    const q = search.toLowerCase()
    return !q || word.word.toLowerCase().includes(q) || word.meaning.includes(q)
  })

  return (
    <div>
      <PageHeader
        title="단어장"
        subtitle={`${words.length}개 단어 · 오늘 복습 ${dueWords.length}개`}
        action={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + 단어 추가
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{ maxWidth: 320 }}
          placeholder="단어 또는 뜻 검색"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Empty
          icon="단어"
          title="단어가 없습니다"
          desc="지문에서 단어를 수집하거나 직접 단어를 추가하세요."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 단어 추가</button>}
        />
      ) : (
        <div className="table-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>단어</th>
                <th>뜻</th>
                <th>예문</th>
                <th>복습</th>
                <th>정답률</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(word => (
                <WordRow
                  key={word.id}
                  word={word}
                  onEdit={() => setEditing(word)}
                  onDelete={() => setDeleting(word)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <WordModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (data) => {
          const { error } = await addWord(data)
          if (error) toast(error.message, 'error')
          else {
            toast('단어가 추가되었습니다.', 'success')
            setShowAdd(false)
          }
        }}
      />

      <WordModal
        open={!!editing}
        word={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          const { error } = await updateWord(editing.id, data)
          if (error) toast(error.message, 'error')
          else {
            toast('수정되었습니다.', 'success')
            setEditing(null)
          }
        }}
      />

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="단어 삭제"
        message={`"${deleting?.word}" 단어를 삭제할까요? 오답 기록도 함께 삭제됩니다.`}
        onConfirm={async () => {
          const { error } = await deleteWord(deleting.id)
          if (error) toast(error.message, 'error')
          else toast('삭제되었습니다.', 'success')
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
      <td style={{ color: 'var(--text-2)', fontSize: 13, maxWidth: 320 }}>
        {word.example || '-'}
      </td>
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
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      word: word?.word ?? '',
      meaning: word?.meaning ?? '',
      example: word?.example ?? '',
      difficulty: word?.difficulty ?? 1,
    })
  }, [word, open])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const handleSave = async () => {
    if (!form.word.trim() || !form.meaning.trim()) return
    setSaving(true)
    await onSave({
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      example: form.example.trim(),
      difficulty: form.difficulty,
    })
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={word ? '단어 수정' : '단어 추가'}>
      <div className="form-group">
        <label className="form-label">단어 *</label>
        <input value={form.word} onChange={event => set('word', event.target.value)} placeholder="예: preserve" />
      </div>
      <div className="form-group">
        <label className="form-label">뜻 *</label>
        <input value={form.meaning} onChange={event => set('meaning', event.target.value)} placeholder="예: 보존하다" />
      </div>
      <div className="form-group">
        <label className="form-label">예문</label>
        <textarea
          rows={3}
          value={form.example}
          onChange={event => set('example', event.target.value)}
          placeholder="지문 속 문장이나 직접 만든 예문을 입력하세요."
          style={{ resize: 'vertical' }}
        />
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
