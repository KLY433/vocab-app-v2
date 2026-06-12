import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'
import { translateText } from '../lib/translate'

export function usePassages(userId) {
  const [passages, setPassages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('passages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setPassages(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const addPassage = async ({ title, content, source }) => {
    let translation = null
    try {
      translation = await translateText(content)
    } catch (e) {
      console.warn('Translation failed:', e.message)
    }

    const { data, error } = await supabase
      .from('passages')
      .insert({ title, content, translation, source, user_id: userId })
      .select()
      .single()
    if (!error) setPassages(prev => [data, ...prev])
    return { data, error }
  }

  const deletePassage = async (id) => {
    const { error } = await supabase.from('passages').delete().eq('id', id)
    if (!error) setPassages(prev => prev.filter(p => p.id !== id))
    return { error }
  }

  return { passages, loading, addPassage, deletePassage, refetch: fetch }
}
