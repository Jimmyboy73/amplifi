import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Child } from './types'

/** Children owned by the current user (parent view). */
export function useChildren() {
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setChildren([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('children')
      .select('id, owner_id, name, date_of_birth, photo_url, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
    setChildren((data as Child[] | null) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { children, loading, refetch }
}
