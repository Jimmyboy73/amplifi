import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

// ── Brand wordmark ──────────────────────────────────────────────────────────

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-jakarta text-xl font-extrabold tracking-tight text-midnight ${className}`}>
      amplifi
    </span>
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
    primary: 'bg-sky text-midnight hover:brightness-105',
    secondary: 'bg-azure text-white hover:brightness-105',
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
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/30 ${className}`}
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
      <Spinner className="h-8 w-8 text-sky" />
    </div>
  )
}
