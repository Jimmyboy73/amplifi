import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Screen, Logo, Card, Button, Disclaimer, FullScreenLoader } from '../../components/ui'

/**
 * P4 — provider signpost (spec §6).
 *
 * ⚠️ PLACEHOLDER — DO NOT SHIP AS-IS. James confirms the provider list AND approves the
 * exact copy before this screen goes live (spec §0, §10 rule 6). Per instruction, this
 * does NOT populate real providers or final wording — generic rows + a visible banner only.
 * When approved, replace the rows with the confirmed neutral, factual list (name, headline
 * fee, minimum), alphabetical/shuffled, each linking OUT in a new tab. No ranking, ever.
 */
export default function ProviderSignpost() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [childName, setChildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!childId) return
    supabase
      .from('children')
      .select('name')
      .eq('id', childId)
      .maybeSingle()
      .then(({ data }) => {
        setChildName((data as { name: string } | null)?.name ?? null)
        setLoading(false)
      })
  }, [childId])

  if (loading) return <FullScreenLoader />
  const child = childName ?? 'your child'

  return (
    <Screen className="pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="w-6" />
      </div>

      {/* Visible placeholder banner so this can never be mistaken for finished copy. */}
      <div className="mb-4 rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-xs font-semibold text-amber">
        PLACEHOLDER SCREEN — provider list and wording pending James's approval. Not final.
      </div>

      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          {child} would need a Junior ISA
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          To receive contributions, {child} needs a Junior ISA. Only a parent or guardian can open
          one — it typically takes a few minutes on the provider's own site. Amplifi doesn't open
          the account or handle any money.
        </p>

        <div className="space-y-3">
          {['Provider A', 'Provider B', 'Provider C'].map((p) => (
            <div
              key={p}
              className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-midnight">{p}</p>
                <p className="text-xs text-slate-400">Fee · minimum — to be confirmed</p>
              </div>
              <span className="text-xs font-semibold text-slate-300">placeholder</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <Button onClick={() => navigate(`/confirm/${childId}`)}>I've opened the account</Button>
          <Button variant="ghost" onClick={() => navigate('/home')}>
            I'll do this later
          </Button>
        </div>
      </Card>

      <Disclaimer />
    </Screen>
  )
}
