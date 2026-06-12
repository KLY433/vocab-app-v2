import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'
import { sm2, nextReviewDate } from '../lib/sm2'

export function useWords(userId) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setWords(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const addWord = async (wordData) => {
    const { data, error } = await supabase
      .from('words')
      .insert({ ...wordData, user_id: userId })
      .select()
      .single()
    if (!error) setWords(prev => [data, ...prev])
    return { data, error }
  }

  const updateWord = async (id, updates) => {
    const { data, error } = await supabase
      .from('words')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setWords(prev => prev.map(w => w.id === id ? data : w))
    return { data, error }
  }

  const deleteWord = async (id) => {
    const { error } = await supabase.from('words').delete().eq('id', id)
    if (!error) setWords(prev => prev.filter(w => w.id !== id))
    return { error }
  }

  const reviewWord = async (id, quality) => {
    const word = words.find(w => w.id === id)
    if (!word) return
    const { intervalDays, easeFactor } = sm2(word.ease_factor, word.interval_days, quality)
    const isCorrect = quality >= 3
    await updateWord(id, {
      interval_days: intervalDays,
      ease_factor: easeFactor,
      next_review: nextReviewDate(intervalDays),
      review_count: word.review_count + 1,
      correct_count: word.correct_count + (isCorrect ? 1 : 0),
    })
    return isCorrect
  }

  const dueWords = words.filter(w => new Date(w.next_review) <= new Date())

  return { words, dueWords, loading, addWord, updateWord, deleteWord, reviewWord, refetch: fetch }
}
