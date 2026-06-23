import { Routes, Route } from 'react-router-dom'
import Root from './routes/Root'
import Login from './routes/auth/Login'
import ResetRequest from './routes/auth/ResetRequest'
import ResetConfirm from './routes/auth/ResetConfirm'
import ParentSignup from './routes/parent/ParentSignup'
import Home from './routes/parent/Home'
import LinkIsa from './routes/parent/LinkIsa'
import InviteLanding from './routes/contributor/InviteLanding'
import ContributorSignup from './routes/contributor/ContributorSignup'
import Contribute from './routes/contributor/Contribute'
import { RequireAuth, RequireParent } from './components/guards'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<ResetRequest />} />
      <Route path="/reset-confirm" element={<ResetConfirm />} />

      {/* Parent flow */}
      <Route path="/signup" element={<ParentSignup />} />
      <Route path="/home" element={<RequireParent><Home /></RequireParent>} />
      <Route path="/link-isa" element={<RequireParent><LinkIsa /></RequireParent>} />

      {/* Contributor flow — invite landing is public (no auth) */}
      <Route path="/invite/:inviteId" element={<InviteLanding />} />
      <Route path="/invite/:inviteId/join" element={<ContributorSignup />} />
      <Route
        path="/contribute/:connectionId"
        element={<RequireAuth><Contribute /></RequireAuth>}
      />

      {/* Fallback */}
      <Route path="*" element={<Root />} />
    </Routes>
  )
}
