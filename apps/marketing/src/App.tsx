import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'

// ── Animated counter ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return count
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <span className="text-[#101628] font-extrabold text-xl tracking-tight">
          amplifi
        </span>
        <button
          type="button"
          onClick={scrollToWaitlist}
          className="bg-[#59C9E9] text-[#101628] font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          Join the waitlist
        </button>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const count = useCountUp(47868, 2000)
  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="min-h-screen bg-[#101628] flex flex-col justify-center pt-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto w-full py-16 sm:py-24">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse flex-shrink-0" />
          <span className="text-[#F59E0B] text-sm font-semibold">Launching soon in the UK</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
          Your child's financial future starts the day they're born.
        </h1>

        {/* Subheadline */}
        <p className="text-white/60 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl">
          Most parents spend 18 years raising a child. Almost none spend 18 years investing for one.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <button
            type="button"
            onClick={scrollToWaitlist}
            className="bg-[#59C9E9] text-[#101628] font-bold text-base px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] min-h-[52px]"
          >
            Download the app
          </button>
          <button
            type="button"
            onClick={scrollToWaitlist}
            className="border-2 border-white text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors active:scale-[0.98] min-h-[52px]"
          >
            Join the waitlist
          </button>
        </div>

        {/* Animated stat */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-[#59C9E9] font-extrabold text-5xl sm:text-6xl tracking-tight mb-3 tabular-nums">
            £{count.toLocaleString('en-GB')}
          </p>
          <p className="text-white/70 text-sm sm:text-base mb-1.5">
            from £50/month from birth at 8% p.a. by age 25
          </p>
          <p className="text-white/30 text-xs">
            Illustrative projection — not a guarantee
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Benefits ──────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    headline: 'Your shop funds their future',
    body: "Buy gift cards for your usual supermarket through Amplifi and earn cashback that goes straight into your child's JISA.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8" />
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
        <path d="M2 21h20" />
        <line x1="12" y1="8" x2="12" y2="5" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    headline: 'Turn birthdays into investments',
    body: "Create a birthday wishlist, share it with family, and any surplus from gifts sweeps automatically into your child's pot.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    headline: 'The whole family can contribute',
    body: 'Grandparents, aunts, uncles — everyone can buy gift cards that earn cashback for your child. Family wealth, built together.',
  },
]

function Benefits() {
  return (
    <section className="bg-white py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.headline} className="bg-[#F4F6F9] rounded-2xl p-7">
              <div className="w-12 h-12 bg-[#59C9E9]/10 rounded-xl flex items-center justify-center text-[#59C9E9] mb-5">
                {b.icon}
              </div>
              <h3 className="text-[#101628] font-bold text-lg mb-2">{b.headline}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── The Number ────────────────────────────────────────────────────────────────

function TheNumber() {
  return (
    <section className="bg-[#101628] py-20 sm:py-32 px-4 sm:px-6 text-center">
      <div className="max-w-3xl mx-auto">
        <p className="text-[#59C9E9] font-extrabold text-7xl sm:text-8xl lg:text-9xl tracking-tight leading-none mb-5">
          11.6×
        </p>
        <p className="text-white text-xl sm:text-2xl font-semibold mb-3">
          more wealth starting at birth vs starting at 30.
        </p>
        <p className="text-white/60 text-base sm:text-lg mb-8">
          Same monthly amount. The difference is when you start.
        </p>
        <p className="text-white/30 text-xs">
          Illustrative projection at 8% p.a. compounded monthly
        </p>
      </div>
    </section>
  )
}

// ── Waitlist ──────────────────────────────────────────────────────────────────

function Waitlist() {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const isValid = firstName.trim().length > 0 && email.includes('@')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'amplifi-marketing-waitlist',
          firstName: firstName.trim(),
          email: email.trim(),
        }).toString(),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="waitlist" className="bg-[#F4F6F9] py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-lg mx-auto text-center">
        <h2 className="text-[#101628] font-extrabold text-3xl sm:text-4xl tracking-tight mb-3">
          Be first. Build more.
        </h2>
        <p className="text-slate-600 text-base sm:text-lg mb-10">
          Join the waitlist and get early access when we launch.
        </p>

        {submitted ? (
          <div className="bg-[#59C9E9]/10 border border-[#59C9E9]/30 rounded-2xl px-6 py-10">
            <p className="text-[#101628] font-semibold text-lg">
              You're on the list. We'll be in touch soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#101628] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#59C9E9]/40 focus:border-[#59C9E9] transition text-base"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#101628] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#59C9E9]/40 focus:border-[#59C9E9] transition text-base"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full bg-[#59C9E9] text-[#101628] font-bold text-base py-4 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]"
            >
              {loading ? 'Joining…' : 'Join the waitlist'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#101628] py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <span className="text-white font-extrabold text-xl tracking-tight">amplifi</span>
          <span className="text-white/60 text-sm">© 2026 Amplifi Group Holdings Ltd</span>
        </div>
        <div className="flex justify-center mb-5">
          <a href="https://letsamplifi.com" className="text-[#59C9E9] text-sm hover:underline">
            letsamplifi.com
          </a>
        </div>
        <p className="text-white/30 text-xs text-center leading-relaxed max-w-2xl mx-auto">
          Amplifi is not yet authorised or regulated by the Financial Conduct Authority. This is not financial advice. Capital at risk.
        </p>
      </div>
    </footer>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="font-jakarta antialiased">
      <Nav />
      <Hero />
      <Benefits />
      <TheNumber />
      <Waitlist />
      <Footer />
    </div>
  )
}
