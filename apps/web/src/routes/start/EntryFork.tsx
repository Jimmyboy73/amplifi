import { useNavigate } from 'react-router-dom'
import { Screen, Logo, Card, Button, Disclaimer } from '../../components/ui'

/**
 * Screen 1 of 3 — "Who are you?" (onboarding redesign §2). The public entry into the
 * pledge/invite flow. The brand line leads; the role button chosen sets the pledger's
 * relationship (so the old relationship question is dropped from later screens). A user
 * arriving on an invite link (/i/:token) skips this and lands on the accept screen.
 */
const GIVERS: { label: string; rel: string }[] = [
  { label: "I'm a grandparent", rel: 'grandparent' },
  { label: "I'm a family member", rel: 'other' },
  { label: "I'm a friend of the family", rel: 'friend' },
]

export default function EntryFork() {
  const navigate = useNavigate()

  return (
    <Screen className="pt-6">
      <div className="mb-8 flex items-center justify-between">
        <span className="w-14" />
        <Logo />
        <span className="w-14 text-right text-xs font-semibold text-slate-400">Step 1 of 3</span>
      </div>

      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          Families build wealth together
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          Tell us where you fit and we'll do the rest.
        </p>

        <div className="space-y-3">
          <Button onClick={() => navigate('/signup')}>I'm a parent</Button>
          {GIVERS.map((g) => (
            <Button
              key={g.rel}
              variant="secondary"
              onClick={() => navigate(`/pledge?rel=${g.rel}`)}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </Card>

      <Disclaimer />
    </Screen>
  )
}
