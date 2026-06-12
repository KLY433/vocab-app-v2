import { useState, useCallback } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { useWords } from '../hooks/useWords'
import { useWrongAnswers } from '../hooks/useWrongAnswers'
import { supabase } from '../supabase/client'
import { PageHeader, Empty } from '../components/common/UI'

const MODES = [
  { id: 'multiple_choice', label: '객관식', icon: '🔘' },
  { id: 'fill_blank',      label: '빈칸', icon: '✏️' },
  { id: 'flashcard',       label: '플래시카드', icon: '🃏' },
]

export default function TestPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { words, dueWords, reviewWord } = useWords(user?.id)
  const { addWrongAnswer } = useWrongAnswers(user?.id)

  const [mode, setMode] = useState('multiple_choice')
  const [useOnlyDue, setUseOnlyDue] = useState(false)
  const [testWords, setTestWords] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([]) // { correct, userAnswer }
  const [phase, setPhase] = useState('setup') // setup | testing | result

  const pool = useOnlyDue ? dueWords : words

  const startTest = useCallback(() => {
    if (pool.length < 2) { toast('단어가 최소 2개 필요합니다', 'error'); return }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(20, pool.length))
    setTestWords(shuffled)
    setCurrent(0)
    setAnswers([])
    setPhase('testing')
  }, [pool, toast])

  const handleAnswer = useCallback(async (userAnswer, correct) => {
    const word = testWords[current]
    const quality = correct ? 4 : 1
    await reviewWord(word.id, quality)
    await addWrongAnswer({ wordId: word.id, userAnswer, correct })
    setAnswers(prev => [...prev, { correct, userAnswer, word }])

    if (current + 1 >= testWords.length) {
      // Save session
      const score = answers.filter(a => a.correct).length + (correct ? 1 : 0)
      await supabase.from('test_sessions').insert({
        user_id: user.id, score, total: testWords.length, mode,
      })
      setPhase('result')
    } else {
      setCurrent(c => c + 1)
    }
  }, [current, testWords, answers, reviewWord, addWrongAnswer, user, mode])

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="🧪 테스트" subtitle="단어 실력을 점검해 보세요" />
        {words.length === 0 ? (
          <Empty icon="📝" title="단어를 먼저 추가하세요" desc="단어장에서 단어를 추가한 후 테스트를 시작하세요" />
        ) : (
          <div style={{ maxWidth: 480 }}>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>테스트 모드</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {MODES.map(m => (
                  <label key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', border: `2px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color .15s',
                  }}>
                    <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} style={{ width: 'auto' }} />
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span style={{ fontWeight: 600 }}>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>단어 풀</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={useOnlyDue} onChange={e => setUseOnlyDue(e.target.checked)} style={{ width: 'auto' }} />
                <span>오늘 복습 예정인 단어만 ({dueWords.length}개)</span>
              </label>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 8 }}>
                전체 {pool.length}개 단어 중 최대 20개로 테스트
              </p>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 16 }} onClick={startTest}>
              테스트 시작
            </button>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'result') {
    const score = answers.filter(a => a.correct).length
    const pct = Math.round((score / answers.length) * 100)
    return (
      <div>
        <PageHeader title="🧪 테스트 결과" />
        <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: 64, fontWeight: 900, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
            {pct}%
          </div>
          <div style={{ fontSize: 18, color: 'var(--text-1)', marginTop: 8 }}>
            {score} / {answers.length} 정답
          </div>
          <div style={{ marginTop: 24, display: 'grid', gap: 10, textAlign: 'left' }}>
            {answers.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${a.correct ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
              }}>
                <span>{a.correct ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 700 }}>{a.word.word}</span>
                <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{a.word.meaning}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={() => setPhase('setup')}>
            다시 테스트
          </button>
        </div>
      </div>
    )
  }

  // Testing phase
  const word = testWords[current]
  const progress = ((current) / testWords.length) * 100

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <PageHeader title="🧪 테스트" subtitle={`${current + 1} / ${testWords.length}`} />
        <button className="btn btn-ghost btn-sm" onClick={() => setPhase('setup')}>그만하기</button>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="progress-bar" style={{ marginBottom: 28 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {mode === 'multiple_choice' && (
          <MultipleChoice word={word} allWords={testWords} onAnswer={handleAnswer} />
        )}
        {mode === 'fill_blank' && (
          <FillBlank word={word} onAnswer={handleAnswer} />
        )}
        {mode === 'flashcard' && (
          <Flashcard word={word} onAnswer={handleAnswer} />
        )}
      </div>
    </div>
  )
}

// ─── Multiple Choice ───────────────────────────────────────
function MultipleChoice({ word, allWords, onAnswer }) {
  const [selected, setSelected] = useState(null)

  const options = (() => {
    const wrong = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - .5).slice(0, 3)
    return [...wrong, word].sort(() => Math.random() - .5)
  })()

  const handleSelect = (opt) => {
    if (selected) return
    setSelected(opt.id)
    setTimeout(() => {
      onAnswer(opt.meaning, opt.id === word.id)
      setSelected(null)
    }, 600)
  }

  return (
    <div className="card">
      <p style={{ color: 'var(--text-1)', fontSize: 13, marginBottom: 8 }}>다음 단어의 뜻은?</p>
      <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 28 }}>{word.word}</h2>
      {word.example && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, fontStyle: 'italic', marginBottom: 24 }}>
          "{word.example}"
        </p>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {options.map(opt => {
          let bg = 'var(--bg-2)'
          let border = 'var(--border)'
          if (selected) {
            if (opt.id === word.id) { bg = 'rgba(34,197,94,.15)'; border = 'var(--green)' }
            else if (opt.id === selected) { bg = 'rgba(239,68,68,.15)'; border = 'var(--red)' }
          }
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              style={{
                padding: '14px 18px', textAlign: 'left', borderRadius: 'var(--radius-md)',
                background: bg, border: `1.5px solid ${border}`, color: 'var(--text-0)',
                fontWeight: 500, transition: 'all .15s', cursor: selected ? 'default' : 'pointer',
              }}
            >{opt.meaning}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Fill Blank ────────────────────────────────────────────
function FillBlank({ word, onAnswer }) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!input.trim() || submitted) return
    setSubmitted(true)
    const correct = input.trim().toLowerCase() === word.word.toLowerCase()
    setTimeout(() => {
      onAnswer(input.trim(), correct)
      setInput('')
      setSubmitted(false)
    }, 800)
  }

  return (
    <div className="card">
      <p style={{ color: 'var(--text-1)', fontSize: 13, marginBottom: 8 }}>다음 뜻에 맞는 영단어를 입력하세요</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{word.meaning}</h2>
      {word.example && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, fontStyle: 'italic', marginBottom: 20 }}>
          힌트: {word.example.replace(new RegExp(word.word, 'gi'), '___')}
        </p>
      )}
      {submitted ? (
        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: input.toLowerCase() === word.word.toLowerCase() ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
          color: input.toLowerCase() === word.word.toLowerCase() ? 'var(--green)' : 'var(--red)',
          fontWeight: 700, fontSize: 18,
        }}>
          {input.toLowerCase() === word.word.toLowerCase() ? '✅ 정답!' : `❌ 정답: ${word.word}`}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="영단어 입력..."
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>확인</button>
        </div>
      )}
    </div>
  )
}

// ─── Flashcard ─────────────────────────────────────────────
function Flashcard({ word, onAnswer }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div>
      <div
        onClick={() => setFlipped(f => !f)}
        className="card"
        style={{
          minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', cursor: 'pointer', textAlign: 'center',
          transition: 'all .3s',
        }}
      >
        {!flipped ? (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>영단어 (클릭하여 뒤집기)</p>
            <h2 style={{ fontSize: 36, fontWeight: 900 }}>{word.word}</h2>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>뜻</p>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{word.meaning}</h2>
            {word.example && (
              <p style={{ color: 'var(--text-1)', fontSize: 14, marginTop: 12, fontStyle: 'italic' }}>
                {word.example}
              </p>
            )}
          </>
        )}
      </div>

      {flipped && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button className="btn btn-danger" style={{ height: 48, fontSize: 15 }} onClick={() => { onAnswer('', false); setFlipped(false) }}>
            ❌ 몰랐어요
          </button>
          <button className="btn btn-success" style={{ height: 48, fontSize: 15 }} onClick={() => { onAnswer(word.word, true); setFlipped(false) }}>
            ✅ 알았어요
          </button>
        </div>
      )}
    </div>
  )
}
