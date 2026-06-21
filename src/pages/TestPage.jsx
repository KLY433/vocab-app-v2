import { useMemo, useState, useCallback } from 'react'
import { useAuthContext, useToast } from '../lib/context'
import { useWords } from '../hooks/useWords'
import { useWrongAnswers } from '../hooks/useWrongAnswers'
import { supabase } from '../supabase/client'
import { PageHeader, Empty } from '../components/common/UI'

const MODES = [
  { id: 'multiple_choice', label: '뜻 입력', icon: '뜻' },
  { id: 'fill_blank', label: '빈칸 선택', icon: '빈칸' },
  { id: 'flashcard', label: '플래시카드', icon: '카드' },
]

const REVIEW_BUCKETS = [
  { id: 'due', label: '오늘/밀린 복습', testable: true },
  { id: 'day1', label: '1일 후', testable: false },
  { id: 'day3', label: '3일 후', testable: false },
  { id: 'day7', label: '7일 후', testable: false },
  { id: 'day14', label: '14일 후', testable: false },
  { id: 'day30', label: '30일 후', testable: false },
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysUntilReview(word) {
  const today = startOfDay(new Date())
  const reviewDate = startOfDay(word.next_review ?? new Date())
  return Math.round((reviewDate - today) / 86400000)
}

function getReviewBucketId(word) {
  const days = daysUntilReview(word)
  if (days <= 0) return 'due'
  if (days <= 1) return 'day1'
  if (days <= 3) return 'day3'
  if (days <= 7) return 'day7'
  if (days <= 14) return 'day14'
  return 'day30'
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightWord(example, word) {
  if (!example) return `예문이 아직 없습니다. ${word}의 뜻을 떠올려 보세요.`
  const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi')
  return example.split(regex).map((part, index) => (
    part.toLowerCase() === word.toLowerCase()
      ? <mark key={index} style={{ background: '#fff2a8', color: 'var(--text-0)', borderRadius: 4, padding: '1px 3px' }}>{part}</mark>
      : part
  ))
}

function blankWord(example, word) {
  if (!example) return '_____ 의 뜻에 맞는 단어를 고르세요.'
  return example.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'), '_____')
}

export default function TestPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { words, reviewWord } = useWords(user?.id)
  const { addWrongAnswer } = useWrongAnswers(user?.id)

  const [mode, setMode] = useState('multiple_choice')
  const [testWords, setTestWords] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('setup')

  const bucketCounts = useMemo(() => {
    return REVIEW_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.id] = words.filter(word => getReviewBucketId(word) === bucket.id).length
      return acc
    }, {})
  }, [words])

  const pool = useMemo(() => {
    return words.filter(word => getReviewBucketId(word) === 'due')
  }, [words])

  const startTest = useCallback(() => {
    const minimum = mode === 'fill_blank' ? 4 : 1
    if (pool.length < minimum) {
      toast(mode === 'fill_blank' ? '빈칸 선택은 단어가 최소 4개 필요합니다.' : '선택한 구간에 테스트할 단어가 없습니다.', 'error')
      return
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(20, pool.length))
    setTestWords(shuffled)
    setCurrent(0)
    setAnswers([])
    setPhase('testing')
  }, [mode, pool, toast])

  const handleAnswer = useCallback(async (userAnswer, correct) => {
    const word = testWords[current]
    const quality = correct ? 4 : 1
    await reviewWord(word.id, quality)
    await addWrongAnswer({ wordId: word.id, userAnswer, correct })
    setAnswers(prev => [...prev, { correct, userAnswer, word }])

    if (current + 1 >= testWords.length) {
      const score = answers.filter(answer => answer.correct).length + (correct ? 1 : 0)
      await supabase.from('test_sessions').insert({
        user_id: user.id,
        score,
        total: testWords.length,
        mode,
      })
      setPhase('result')
    } else {
      setCurrent(value => value + 1)
    }
  }, [current, testWords, answers, reviewWord, addWrongAnswer, user, mode])

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="테스트" subtitle="오늘 해야 할 복습만 문맥 속에서 확인하세요." />
        {words.length === 0 ? (
          <Empty
            icon="단어"
            title="단어를 먼저 추가하세요"
            desc="지문에서 모르는 단어를 모은 뒤 테스트를 시작할 수 있습니다."
          />
        ) : (
          <div style={{ maxWidth: 640 }}>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>테스트 방식</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {MODES.map(item => (
                  <label key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    border: `2px solid ${mode === item.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}>
                    <input type="radio" name="mode" checked={mode === item.id} onChange={() => setMode(item.id)} style={{ width: 'auto' }} />
                    <span style={{ minWidth: 34, color: 'var(--text-2)', fontSize: 13 }}>{item.icon}</span>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>복습 예정</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                {REVIEW_BUCKETS.map(bucket => {
                  const active = bucket.testable
                  return (
                    <button
                      key={bucket.id}
                      disabled={!bucket.testable}
                      className="btn btn-ghost"
                      style={{
                        justifyContent: 'space-between',
                        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        background: active ? 'rgba(99,102,241,.14)' : 'var(--bg-2)',
                        opacity: bucket.testable ? 1 : 0.72,
                        cursor: bucket.testable ? 'default' : 'not-allowed',
                      }}
                      title={bucket.testable ? '오늘 복습할 단어입니다' : '아직 복습 예정일이 되지 않았습니다'}
                    >
                      <span>{bucket.label}</span>
                      <strong>{bucketCounts[bucket.id] ?? 0}</strong>
                    </button>
                  )
                })}
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 12 }}>
                밀린 단어는 오늘 복습에 계속 남습니다. 미래 복습 단어는 예정일이 되었을 때 테스트할 수 있습니다.
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
    const score = answers.filter(answer => answer.correct).length
    const pct = Math.round((score / answers.length) * 100)

    return (
      <div>
        <PageHeader title="테스트 결과" />
        <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: 64, fontWeight: 900, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
            {pct}%
          </div>
          <div style={{ fontSize: 18, color: 'var(--text-1)', marginTop: 8 }}>
            {score} / {answers.length} 정답
          </div>
          <div style={{ marginTop: 24, display: 'grid', gap: 10, textAlign: 'left' }}>
            {answers.map((answer, index) => (
              <div key={index} style={{
                display: 'grid',
                gap: 4,
                padding: '10px 14px',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${answer.correct ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: answer.correct ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                    {answer.correct ? '정답' : '오답'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{answer.word.word}</span>
                  <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{answer.word.meaning}</span>
                </div>
                {answer.word.example && (
                  <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{answer.word.example}</p>
                )}
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

  const word = testWords[current]
  const progress = (current / testWords.length) * 100

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <PageHeader title="테스트" subtitle={`${current + 1} / ${testWords.length}`} />
        <button className="btn btn-ghost btn-sm" onClick={() => setPhase('setup')}>그만하기</button>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="progress-bar" style={{ marginBottom: 28 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {mode === 'multiple_choice' && (
          <MeaningInput word={word} onAnswer={handleAnswer} />
        )}
        {mode === 'fill_blank' && (
          <FillBlankChoice word={word} allWords={testWords} onAnswer={handleAnswer} />
        )}
        {mode === 'flashcard' && (
          <Flashcard word={word} onAnswer={handleAnswer} />
        )}
      </div>
    </div>
  )
}

function MeaningInput({ word, onAnswer }) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)

  const handleSubmit = () => {
    if (!input.trim() || submitted) return
    const normalizedAnswer = input.trim().toLowerCase()
    const normalizedMeaning = word.meaning.toLowerCase()
    const isCorrect = normalizedMeaning.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedMeaning)

    setCorrect(isCorrect)
    setSubmitted(true)
    setTimeout(() => {
      onAnswer(input.trim(), isCorrect)
      setInput('')
      setSubmitted(false)
      setCorrect(false)
    }, 900)
  }

  return (
    <div className="card">
      <p style={{ color: 'var(--text-1)', fontSize: 13, marginBottom: 8 }}>예문 속 단어의 뜻을 입력하세요.</p>
      <p style={{ fontSize: 20, lineHeight: 1.8, marginBottom: 16 }}>
        {highlightWord(word.example, word.word)}
      </p>
      <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>{word.word}의 뜻은?</h2>
      {submitted ? (
        <div style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          background: correct ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
          color: correct ? 'var(--green)' : 'var(--red)',
          fontWeight: 700,
        }}>
          {correct ? '정답입니다.' : `정답: ${word.meaning}`}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleSubmit()}
            placeholder="뜻을 입력하세요"
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>확인</button>
        </div>
      )}
    </div>
  )
}

function FillBlankChoice({ word, allWords, onAnswer }) {
  const [selected, setSelected] = useState(null)

  const options = useMemo(() => {
    const wrong = allWords.filter(item => item.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3)
    return [...wrong, word].sort(() => Math.random() - 0.5)
  }, [allWords, word])

  const handleSelect = (option) => {
    if (selected) return
    setSelected(option.id)
    setTimeout(() => {
      onAnswer(option.word, option.id === word.id)
      setSelected(null)
    }, 700)
  }

  return (
    <div className="card">
      <p style={{ color: 'var(--text-1)', fontSize: 13, marginBottom: 8 }}>빈칸에 들어갈 단어를 고르세요.</p>
      <p style={{ fontSize: 21, lineHeight: 1.8, marginBottom: 24 }}>
        {blankWord(word.example, word.word)}
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {options.map((option, index) => {
          let bg = 'var(--bg-2)'
          let border = 'var(--border)'
          if (selected) {
            if (option.id === word.id) {
              bg = 'rgba(34,197,94,.15)'
              border = 'var(--green)'
            } else if (option.id === selected) {
              bg = 'rgba(239,68,68,.15)'
              border = 'var(--red)'
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              style={{
                padding: '14px 18px',
                textAlign: 'left',
                borderRadius: 'var(--radius-md)',
                background: bg,
                border: `1.5px solid ${border}`,
                color: 'var(--text-0)',
                fontWeight: 600,
                cursor: selected ? 'default' : 'pointer',
              }}
            >
              {index + 1}. {option.word}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Flashcard({ word, onAnswer }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div>
      <div
        onClick={() => setFlipped(value => !value)}
        className="card"
        style={{
          minHeight: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        {!flipped ? (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>클릭해서 뜻 보기</p>
            <h2 style={{ fontSize: 36, fontWeight: 900 }}>{word.word}</h2>
            {word.example && (
              <p style={{ color: 'var(--text-1)', fontSize: 14, marginTop: 12, lineHeight: 1.7 }}>
                {highlightWord(word.example, word.word)}
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>뜻</p>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{word.meaning}</h2>
          </>
        )}
      </div>

      {flipped && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button className="btn btn-danger" style={{ height: 48, fontSize: 15 }} onClick={() => { onAnswer('', false); setFlipped(false) }}>
            몰라요
          </button>
          <button className="btn btn-success" style={{ height: 48, fontSize: 15 }} onClick={() => { onAnswer(word.word, true); setFlipped(false) }}>
            알아요
          </button>
        </div>
      )}
    </div>
  )
}
