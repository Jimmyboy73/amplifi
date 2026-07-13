// "Occasions" tab — placeholder until its data model is built (birthday/Christmas gifting
// moments need their own tables). Honest "coming soon" so the three-tab shell is complete.
import { Logo } from '../../components/ui'
import { BottomTabs } from '../../components/BottomTabs'

export default function OccasionsComingSoon() {
  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-24">
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="w-6" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">Occasions</h1>
        <p className="mt-1 text-sm text-slate-500">Birthday and Christmas gifting moments.</p>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
            🎁
          </div>
          <p className="text-base font-bold text-midnight">Coming soon</p>
          <p className="mx-auto mt-1 max-w-[260px] text-sm leading-snug text-slate-400">
            Soon you'll be able to open birthday and Christmas gifting moments — and family can chip
            in with no account.
          </p>
        </div>
      </div>

      <BottomTabs active="occasions" />
    </div>
  )
}
