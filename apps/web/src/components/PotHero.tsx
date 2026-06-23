import { gbp } from '../lib/format'

/** The hero number. Labelled "Pot" / "contributions set up for {child}" — never "balance". */
export function PotHero({ childName, pot }: { childName: string; pot: number }) {
  return (
    <div className="rounded-2xl bg-midnight px-5 pb-5 pt-6 text-center text-white">
      <p className="text-base font-bold">{childName}'s Pot</p>
      <p className="mt-3 text-5xl font-extrabold tracking-tight">{gbp(pot)}</p>
      <p className="mt-2 text-sm text-white/50">contributions set up for {childName}</p>
      <p className="mx-auto mt-3 max-w-xs text-xs leading-snug text-white/35">
        Your ISA is held by your provider — this tracks the contributions the family has logged.
      </p>
    </div>
  )
}
