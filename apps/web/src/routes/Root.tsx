import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useChildren } from '../lib/useChildren'
import { useContributorConnections } from '../lib/useContributorConnections'
import { useFollowedChildren } from '../lib/follow'
import { FullScreenLoader } from '../components/ui'

/**
 * Entry resolver: route a user to the right home.
 *  - not signed in         → /login
 *  - owns a child (parent)  → /home
 *  - contributor only       → their first connected child's /contribute
 *  - follows a grandchild   → /following
 *  - signed in, no link     → /signup (offer to start their own)
 */
export default function Root() {
  const { user, isLoading } = useAuth()
  const { children, loading: childrenLoading } = useChildren()
  const { connections, loading: connLoading } = useContributorConnections()
  const { followed, loading: followLoading } = useFollowedChildren()

  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (childrenLoading || connLoading || followLoading) return <FullScreenLoader />

  if (children.length > 0) return <Navigate to="/home" replace />
  if (connections.length > 0) return <Navigate to={`/contribute/${connections[0].id}`} replace />
  if (followed.length > 0) return <Navigate to="/following" replace />

  // Signed in but not linked to any child — send to signup to set up their own.
  return <Navigate to="/signup" replace />
}
