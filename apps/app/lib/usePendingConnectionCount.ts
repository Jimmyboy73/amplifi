import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export function usePendingConnectionCount(): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) { setCount(0); return }
    supabase
      .from('family_connections')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('status', 'pending')
      .then(({ count: c }) => setCount(c ?? 0))
  }, [user?.id])

  return count
}
