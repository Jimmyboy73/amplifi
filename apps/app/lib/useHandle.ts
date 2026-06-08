import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export function useHandle() {
  const { user } = useAuth()
  const [handle, setHandle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHandle = async (userId: string) => {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', userId)
      .single()
    if (!err && data) setHandle((data as { handle: string | null }).handle ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    void fetchHandle(user.id)
  }, [user?.id])

  const refetch = () => {
    if (user) void fetchHandle(user.id)
  }

  async function checkAvailability(input: string): Promise<boolean> {
    if (!user || !input) return false
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('handle', input)
      .neq('id', user.id)
      .maybeSingle()
    return data === null
  }

  async function saveHandle(input: string): Promise<boolean> {
    if (!user) return false
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('profiles')
      .update({ handle: input.toLowerCase() } as never)
      .eq('id', user.id)
    setSaving(false)
    if (err) {
      if (err.code === '23505') {
        setError('That handle is already taken.')
      } else {
        setError(err.message)
      }
      return false
    }
    setHandle(input.toLowerCase())
    return true
  }

  return { handle, loading, refetch, checkAvailability, saveHandle, saving, error }
}
