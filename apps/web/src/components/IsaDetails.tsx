import { useState } from 'react'
import { formatSortCode } from '../lib/format'

type Jisa = {
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

function CopyRow({ label, display, raw }: { label: string; display: string; raw: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — value is still visible to copy manually */
    }
  }
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex-1 px-3 text-sm font-bold text-midnight">{display}</span>
      <button
        className="rounded-lg bg-sky/20 px-2.5 py-1 text-xs font-bold text-azure"
        onClick={() => void copy()}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  )
}

/** The parent's account details shown to a contributor as a standing-order target. */
export function IsaDetails({ childName, jisa }: { childName: string; jisa: Jisa | null }) {
  if (!jisa) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">
        {childName}'s account details aren't ready yet. Check back soon — you'll be able to set up
        your standing order here.
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      {jisa.provider_name && (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-azure">{jisa.provider_name}</p>
      )}
      <CopyRow label="Sort code" display={formatSortCode(jisa.sort_code)} raw={jisa.sort_code} />
      <CopyRow label="Account number" display={jisa.account_number} raw={jisa.account_number} />
      <CopyRow label="Reference" display={jisa.payment_reference} raw={jisa.payment_reference} />
    </div>
  )
}
