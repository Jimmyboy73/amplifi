import { Routes, Route } from 'react-router-dom'
import Root from './routes/Root'
import Login from './routes/auth/Login'
import ResetRequest from './routes/auth/ResetRequest'
import ResetConfirm from './routes/auth/ResetConfirm'
import ParentSignup from './routes/parent/ParentSignup'
import HomeMission from './routes/parent/HomeMission'
import FamilyView from './routes/parent/FamilyView'
import OccasionsView from './routes/parent/OccasionsView'
import GiftPage from './routes/gift/GiftPage'
import LinkIsa from './routes/parent/LinkIsa'
import InviteLanding from './routes/contributor/InviteLanding'
import ContributorSignup from './routes/contributor/ContributorSignup'
import Contribute from './routes/contributor/Contribute'
import EntryFork from './routes/start/EntryFork'
import PledgeFlow from './routes/pledge/PledgeFlow'
import PledgeStatus from './routes/pledge/PledgeStatus'
import TokenLanding from './routes/invite/TokenLanding'
import ParentAccept from './routes/parent/ParentAccept'
import ProviderSignpost from './routes/parent/ProviderSignpost'
import ConfirmAccount from './routes/parent/ConfirmAccount'
import InviteFamily from './routes/parent/InviteFamily'
import FamilyMission from './routes/prototype/FamilyMission'
import ProviderSignpostPrototype from './routes/prototype/ProviderSignpostPrototype'
import FamilyTab from './routes/prototype/FamilyTab'
import OccasionsTab from './routes/prototype/OccasionsTab'
import { RequireAuth, RequireParent } from './components/guards'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />

      {/* Pledge / invite flow — public entry fork, family-member flow, opaque-token landing */}
      <Route path="/start" element={<EntryFork />} />
      <Route path="/pledge" element={<PledgeFlow />} />
      <Route path="/i/:token/pledge" element={<PledgeFlow />} />
      <Route path="/pledge/status/:token" element={<PledgeStatus />} />
      <Route path="/i/:token" element={<TokenLanding />} />
      <Route path="/gift/:token" element={<GiftPage />} />
      <Route path="/i/:token/accept" element={<ParentAccept />} />
      <Route path="/provider/:childId" element={<RequireAuth><ProviderSignpost /></RequireAuth>} />
      <Route path="/confirm/:childId" element={<RequireAuth><ConfirmAccount /></RequireAuth>} />
      <Route path="/invite-family/:childId" element={<RequireAuth><InviteFamily /></RequireAuth>} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<ResetRequest />} />
      <Route path="/reset-confirm" element={<ResetConfirm />} />

      {/* Parent flow */}
      <Route path="/signup" element={<ParentSignup />} />
      {/* Home is now the Family Mission (HomeMission). Old pot page kept at routes/parent/Home.tsx for rollback. */}
      <Route path="/home" element={<RequireParent><HomeMission /></RequireParent>} />
      <Route path="/family" element={<RequireParent><FamilyView /></RequireParent>} />
      <Route path="/occasions" element={<RequireParent><OccasionsView /></RequireParent>} />
      <Route path="/link-isa" element={<RequireParent><LinkIsa /></RequireParent>} />

      {/* Contributor flow — invite landing is public (no auth) */}
      <Route path="/invite/:inviteId" element={<InviteLanding />} />
      <Route path="/invite/:inviteId/join" element={<ContributorSignup />} />
      <Route
        path="/contribute/:connectionId"
        element={<RequireAuth><Contribute /></RequireAuth>}
      />

      {/* Prototype — isolated visual mockup (dummy data, no auth, no db). Design review only. */}
      <Route path="/prototype/home" element={<FamilyMission />} />
      <Route path="/prototype/provider" element={<ProviderSignpostPrototype />} />
      <Route path="/prototype/family" element={<FamilyTab />} />
      <Route path="/prototype/occasions" element={<OccasionsTab />} />

      {/* Fallback */}
      <Route path="*" element={<Root />} />
    </Routes>
  )
}
