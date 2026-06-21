import { useState } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { usePassages } from '../hooks/usePassages'
import { Modal, Empty, Confirm, PageHeader } from '../components/common/UI'

export default function LibraryPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { passages, loading, addPassage, deletePassage } = usePassages(user?.id)

  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [translating, setTranslating] = useState(false)

  const handleAdd = async (data) => {
    setTranslating(true)
    const { error } = await addPassage(data)
    setTranslating(false)
    if (error) toast(error.message, 'error')
    else { toast('지문이 추가되었습니다 (번역 포함)', 'success'); setShowAdd(false) }
  }

  return (
    <div>
      <PageHeader
        title="📚 지문 라이브러리"
        subtitle={`${passages.length}개 지문`}
        action={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + 지문 추가
          </button>
        }
      />

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : passages.length === 0 ? (
        <Empty icon="📄" title="지문이 없습니다" desc="영어 지문을 추가하면 자동으로 번역됩니다"
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 지문 추가</button>}
        />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {passages.map(p => (
            <PassageCard
              key={p.id}
              passage={p}
              onClick={() => setViewing(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddPassageModal
        open={showAdd}
        translating={translating}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />

      {/* View Modal */}
      {viewing && (
        <PassageViewModal
          passage={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Delete Confirm */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="지문 삭제"
        message={`"${deleting?.title}"을(를) 삭제할까요?`}
        onConfirm={async () => {
          const { error } = await deletePassage(deleting.id)
          if (error) toast(error.message, 'error')
          else toast('삭제되었습니다', 'success')
        }}
      />
    </div>
  )
}

function PassageCard({ passage, onClick, onDelete }) {
  const preview = passage.content.slice(0, 140) + (passage.content.length > 140 ? '...' : '')
  const date = new Date(passage.created_at).toLocaleDateString('ko-KR')

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color .15s' }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>{passage.title}</h3>
            {passage.translation && <span className="badge badge-green">번역 있음</span>}
          </div>
          <p style={{ color: 'var(--text-1)', fontSize: 14, lineHeight: 1.7 }}>{preview}</p>
          {passage.source && (
            <p style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 8 }}>출처: {passage.source}</p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{date}</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >삭제</button>
        </div>
      </div>
    </div>
  )
}

function PassageViewModal({ passage, onClose }) {
  const [showTranslation, setShowTranslation] = useState(false)
const [selectedWord, setSelectedWord] = useState('')
const [savedWords, setSavedWords] = useState([])

function handleSelection() {
  const text = window
    .getSelection()
    .toString()
    .trim()

  if (!text) return
  if (text.includes(' ')) return

  setSelectedWord(text)
}
  return (
    <Modal open onClose={onClose} title={passage.title}>
      {/* Toggle */}
      {passage.translation && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 20 }}>
          {[false, true].map(t => (
            <button
              key={t}
              onClick={() => setShowTranslation(t)}
              style={{
                flex: 1, padding: '7px', borderRadius: 'var(--radius-sm)',
                fontWeight: 600, fontSize: 13, transition: 'all .15s',
                background: showTranslation === t ? 'var(--accent)' : 'transparent',
                color: showTranslation === t ? '#fff' : 'var(--text-1)',
              }}
            >{t ? '🇰🇷 번역' : '🇬🇧 원문'}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div onMouseUp={handleSelection} style={{
        background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
        padding: '20px', maxHeight: '55vh', overflowY: 'auto',
        lineHeight: 1.9, fontSize: 15,
        color: showTranslation ? 'var(--text-0)' : 'var(--text-0)',
      }}>
        {showTranslation && passage.translation ? passage.translation : passage.content}
      </div> {selectedWord && (
  <div
    className="card"
    style={{
      marginTop: 12,
      padding: 12
    }}
  >
    <strong>선택한 단어</strong>

    <div style={{ margin: '8px 0' }}>
      {selectedWord}
    </div>

    <button
      className="btn btn-primary btn-sm"
      onClick={() => {

        if (savedWords.includes(selectedWord))
          return

        setSavedWords(prev => [
          ...prev,
          selectedWord
        ])

        setSelectedWord('')
      }}
    >
      단어장 추가
    </button>
  </div>
)}

      {passage.source && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-2)' }}>출처: {passage.source}</p>
      )}

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
      </div>
    </Modal>
  )
}

function AddPassageModal({ open, onClose, onSave, translating }) {
  const [form, setForm] = useState({ title: '', content: '', source: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="지문 추가">
      <div className="form-group">
        <label className="form-label">제목 *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="예: 2024 수능 영어 지문 1" />
      </div>
      <div className="form-group">
        <label className="form-label">본문 (영어) *</label>
        <textarea
          rows={8}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          placeholder="영어 지문을 붙여넣으세요..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">출처</label>
        <input value={form.source} onChange={e => set('source', e.target.value)} placeholder="예: 2024 수능 외국어 영역" />
      </div>

      {translating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: 'var(--text-1)', fontSize: 13 }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          DeepL로 번역 중...
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={translating}>취소</button>
        <button
          className="btn btn-primary"
          disabled={translating || !form.title || !form.content}
          onClick={() => onSave(form)}
        >
          {translating ? '번역 중...' : '저장'}
        </button>
      </div>
    </Modal>
  )
}
