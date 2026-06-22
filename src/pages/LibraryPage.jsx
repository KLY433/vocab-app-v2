import { useMemo, useState } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { usePassages } from '../hooks/usePassages'
import { useWords } from '../hooks/useWords'
import { translateText } from '../lib/translate'
import { Modal, Empty, Confirm, PageHeader } from '../components/common/UI'
import { getWordInfo } from '../lib/dictionary'
const WORD_RE = /^[A-Za-z][A-Za-z'-]*$/

function cleanSelectedWord(text) {
  return text.trim().replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase()
}

function getSentenceForWord(content, word) {
  const sentences = content.match(/[^.!?]+[.!?]?/g) ?? [content]
  const lowerWord = word.toLowerCase()
  return sentences.find(sentence => sentence.toLowerCase().includes(lowerWord))?.trim() ?? ''
}

function tokenizeText(text) {
  return text.split(/(\s+|[.,!?;:"()[\]{}])/g).filter(Boolean)
}

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

    if (error) {
      toast(error.message, 'error')
      return
    }

    toast('지문이 추가되었습니다.', 'success')
    setShowAdd(false)
  }

  return (
    <div>
      <PageHeader
        title="지문 라이브러리"
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
        <Empty
          icon="📚"
          title="저장된 지문이 없습니다"
          desc="영어 지문을 추가하고, 모르는 단어를 지문 안에서 바로 모아보세요."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 지문 추가</button>}
        />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {passages.map(passage => (
            <PassageCard
              key={passage.id}
              passage={passage}
              onClick={() => setViewing(passage)}
              onDelete={() => setDeleting(passage)}
            />
          ))}
        </div>
      )}

      <AddPassageModal
        open={showAdd}
        translating={translating}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />

      {viewing && (
        <PassageViewModal
          passage={viewing}
          userId={user?.id}
          onClose={() => setViewing(null)}
        />
      )}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="지문 삭제"
        message={`"${deleting?.title}" 지문을 삭제할까요?`}
        onConfirm={async () => {
          const { error } = await deletePassage(deleting.id)
          if (error) toast(error.message, 'error')
          else toast('삭제되었습니다.', 'success')
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
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

function PassageViewModal({ passage, userId, onClose }) {
  const toast = useToast()
  const { addWords } = useWords(userId)
  const [showTranslation, setShowTranslation] = useState(false)
  const [selectedWords, setSelectedWords] = useState([])
  const [saving, setSaving] = useState(false)
  const [translatingWords, setTranslatingWords] = useState(false)

  const visibleText = showTranslation && passage.translation ? passage.translation : passage.content
  const selectedSet = useMemo(() => new Set(selectedWords), [selectedWords])

  const addSelectedWord = (rawText) => {
    const word = cleanSelectedWord(rawText)
    if (!WORD_RE.test(word)) return

    setSelectedWords(prev => {
      if (prev.includes(word)) return prev
      return [...prev, word]
    })
  }

  const handleSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString() ?? ''
    const word = cleanSelectedWord(text)

    selection?.removeAllRanges()
    if (!word || text.trim().includes(' ')) return

    addSelectedWord(word)
  }

  const handleSaveWords = async () => {
    if (selectedWords.length === 0) return

    setSaving(true)
    setTranslatingWords(true)
    const rows = await Promise.all(selectedWords.map(async word => {
      let meaning = '뜻 입력 필요'
      try {
        const info = await getWordInfo(word)
        console.log("INFO 확인:", word, info)
meaning = info?.translatedText || '뜻 없음'
      } catch (error) {
        console.warn(`Failed to translate word "${word}":`, error)
      }

      return {
        word,
        meaning,
        example: getSentenceForWord(passage.content, word),
      }
    }))
    console.log("ROWS 확인:", rows)
    setTranslatingWords(false)

    const { error } = await addWords(rows)
    setSaving(false)

    if (error) {
      toast(error.message, 'error')
      return
    }

    toast(`${selectedWords.length}개 단어를 단어장에 추가했습니다.`, 'success')
    setSelectedWords([])
  }

  const renderContent = () => {
    if (showTranslation) return visibleText

    return tokenizeText(visibleText).map((token, index) => {
      const cleaned = cleanSelectedWord(token)
      const highlighted = cleaned && selectedSet.has(cleaned)

      if (!highlighted) return token

      return (
        <mark
          key={`${token}-${index}`}
          style={{
            background: '#fff2a8',
            color: 'var(--text-0)',
            borderRadius: 4,
            padding: '1px 3px',
          }}
        >
          {token}
        </mark>
      )
    })
  }

  return (
    <Modal open onClose={onClose} title={passage.title}>
      {passage.translation && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 20 }}>
          {[false, true].map(value => (
            <button
              key={String(value)}
              onClick={() => setShowTranslation(value)}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all .15s',
                background: showTranslation === value ? 'var(--accent)' : 'transparent',
                color: showTranslation === value ? '#fff' : 'var(--text-1)',
              }}
            >
              {value ? '번역' : '원문'}
            </button>
          ))}
        </div>
      )}

      <div
        onMouseUp={handleSelection}
        style={{
          background: 'var(--bg-2)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          maxHeight: '50vh',
          overflowY: 'auto',
          lineHeight: 1.9,
          fontSize: 15,
          color: 'var(--text-0)',
          whiteSpace: 'pre-wrap',
          userSelect: 'text',
        }}
      >
        {renderContent()}
      </div>

      <div className="card" style={{ marginTop: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <strong>선택된 단어</strong>
          {selectedWords.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedWords([])}>
              모두 지우기
            </button>
          )}
        </div>

        {selectedWords.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            원문에서 모르는 영어 단어를 드래그하면 여기에 모입니다.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {selectedWords.map(word => (
                <button
                  key={word}
                  className="badge badge-orange"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedWords(prev => prev.filter(item => item !== word))}
                  title="클릭하면 목록에서 제거됩니다"
                >
                  {word} ×
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSaveWords}
              disabled={saving}
            >
              {translatingWords ? '뜻 자동 생성 중...' : saving ? '추가 중...' : `단어장에 ${selectedWords.length}개 추가`}
            </button>
          </>
        )}
      </div>

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
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  return (
    <Modal open={open} onClose={onClose} title="지문 추가">
      <div className="form-group">
        <label className="form-label">제목 *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="예: 2024 수능 영어 지문 1"
        />
      </div>
      <div className="form-group">
        <label className="form-label">본문 *</label>
        <textarea
          rows={8}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          placeholder="영어 지문을 붙여넣으세요."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">출처</label>
        <input
          value={form.source}
          onChange={e => set('source', e.target.value)}
          placeholder="예: 2024 수능 영어"
        />
      </div>

      {translating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: 'var(--text-1)', fontSize: 13 }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          번역 중...
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={translating}>취소</button>
        <button
          className="btn btn-primary"
          disabled={translating || !form.title || !form.content}
          onClick={() => onSave(form)}
        >
          {translating ? '저장 중...' : '저장'}
        </button>
      </div>
    </Modal>
  )
}
