import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

// ── Brand lockup ────────────────────────────────────────────────────────────
// Horizontal Amplifi lockup (blue mark + wordmark), dark variant — the visible
// match for the previous text-midnight wordmark on the app's offwhite surfaces.
// Served from public/ (the convention for static assets here). Height scales with
// font-size (text-xl by default, text-2xl on hero screens) so each screen keeps the
// optical size and box height the old text node had — no layout shift.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/amplifi-lockup-dark-transparent.png"
      alt="Amplifi"
      className={`block h-[1.4em] w-auto text-xl ${className}`}
    />
  )
}

// ── Page shell ──────────────────────────────────────────────────────────────

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  )
}

// ── Buttons ─────────────────────────────────────────────────────────────────

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40'
  const styles: Record<string, string> = {
    // primary = solid Core blue with white text (matches the new home CTAs);
    // secondary = outline Core (keeps hierarchy where a screen has several actions).
    primary: 'bg-azure text-white hover:brightness-105',
    secondary: 'border-2 border-azure bg-white text-azure hover:bg-azure/5',
    ghost: 'bg-transparent text-azure hover:bg-azure/5',
  }
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-label="Loading"
    />
  )
}

// ── Inputs ──────────────────────────────────────────────────────────────────

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
}

export function Field({ label, hint, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-midnight">{label}</span>}
      <input
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30 ${className}`}
        {...rest}
      />
      {hint && <span className="mt-1.5 block text-xs leading-snug text-slate-400">{hint}</span>}
    </label>
  )
}

// ── Pills (amount / frequency / relationship pickers) ───────────────────────

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-midnight bg-midnight text-white'
          : 'border-slate-200 bg-white text-midnight hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

// ── Full-screen loader ──────────────────────────────────────────────────────

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-offwhite">
      <Spinner className="h-8 w-8 text-azure" />
    </div>
  )
}

// ── Standing FCA disclaimer ───────────────────────────────────────────────────
// Required on EVERY screen in the pledge/invite flow (spec §10). Do not reword —
// this is the approved compliance copy. `mt-auto` pins it to the bottom of a
// flex-column Screen so it always sits under the content.

export const FCA_DISCLAIMER =
  'Amplifi is pre-launch and not yet authorised or regulated by the FCA. Nothing here is ' +
  'financial advice or an invitation to invest. Amplifi does not open accounts or hold or ' +
  'move money. Investments can fall as well as rise.'

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`mt-auto pt-8 text-center text-[11px] leading-snug text-slate-400 ${className}`}>
      {FCA_DISCLAIMER}
    </p>
  )
}
