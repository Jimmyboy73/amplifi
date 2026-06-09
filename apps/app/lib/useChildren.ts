import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type ChildRecord = {
  id: string
  name: string
  date_of_birth: string
  photo_url: string | null
}

export function useChildren() {
  const { user } = useAuth()
  const [children, setChildren] = useState<ChildRecord[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoaded = useRef(false)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    // Only show the loading spinner on the very first fetch.
    // Subsequent calls (e.g. useFocusEffect on Home) update children silently
    // so they don't trigger the childrenLoading → isLoading → animation chain.
    if (!hasLoaded.current) setLoading(true)
    const { data } = await supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
    setChildren((data ?? []) as ChildRecord[])
    setLoading(false)
    hasLoaded.current = true
  }, [user?.id])

  useEffect(() => { void refetch() }, [refetch])

  return { children, loading, refetch }
}
