import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useChildren } from '../lib/useChildren'
import { FullScreenLoader } from './ui'

/** Requires a signed-in user; otherwise sends to /login, remembering where we came from. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullScreenLoader />
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <>{children}</>
}

/** Requires a signed-in user who owns at least one child (parent). */
export function RequireParent({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { children: kids, loading: kidsLoading } = useChildren()
  if (authLoading || (user && kidsLoading)) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (kids.length === 0) return <Navigate to="/" replace />
  return <>{children}</>
}
