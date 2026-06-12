import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'

export function useWrongAnswers(userId) {
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('wrong_answers')
      .select(`*, words(word, meaning, example, suneung_freq)`)
      .eq('user_id', userId)
      .eq('correct', false)
      .order('tested_at', { ascending: false })
    setWrongAnswers(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const addWrongAnswer = async ({ wordId, userAnswer, correct }) => {
    const { error } = await supabase.from('wrong_answers').insert({
      user_id: userId,
      word_id: wordId,
      user_answer: userAnswer,
      correct,
    })
    if (!error) fetch()
    return { error }
  }

  const clearWordWrongs = async (wordId) => {
    const { error } = await supabase
      .from('wrong_answers')
      .delete()
      .eq('user_id', userId)
      .eq('word_id', wordId)
    if (!error) setWrongAnswers(prev => prev.filter(w => w.word_id !== wordId))
    return { error }
  }

  // Group by word_id for display
  const grouped = wrongAnswers.reduce((acc, wa) => {
    const key = wa.word_id
    if (!acc[key]) acc[key] = { ...wa.words, word_id: key, count: 0, entries: [] }
    acc[key].count++
    acc[key].entries.push(wa)
    return acc
  }, {})

  return { wrongAnswers, grouped: Object.values(grouped), loading, addWrongAnswer, clearWordWrongs, refetch: fetch }
}
