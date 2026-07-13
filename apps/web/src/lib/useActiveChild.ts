import { useState, useEffect, useCallback } from 'react'
import { useChildren } from './useChildren'
import type { Child } from './types'

const KEY = 'amplifi.activeChildId'

/**
 * The "active" child for a parent with more than one child. Wraps useChildren and remembers
 * the chosen child in localStorage so it persists across tabs (Home / My Family / Occasions)
 * and reloads. Falls back to the first child if none is chosen or the stored id is gone.
 */
export function useActiveChild() {
  const { children, loading, refetch } = useChildren()
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  })

  const child: Child | null =
    children.find((c) => c.id === activeId) ?? children[0] ?? null

  // Keep the stored id in step with the resolved child (e.g. after the list loads, or if the
  // stored child was removed).
  useEffect(() => {
    if (child && child.id !== activeId) {
      setActiveId(child.id)
      try {
        localStorage.setItem(KEY, child.id)
      } catch {
        /* ignore */
      }
    }
  }, [child, activeId])

  const setActiveChild = useCallback((id: string) => {
    setActiveId(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  return { child, children, loading, refetch, setActiveChild }
}
