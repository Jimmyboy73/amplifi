import { useState } from 'react'

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      })
      if (!response.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="waitlist" className="py-24 bg-brand-navy">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        {submitted ? (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">You're on the list!</h2>
            <p className="text-white/70 text-lg leading-relaxed">
              We'll be in touch when Amplifi launches. We're working hard to build something special for UK families.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
                Be first to know
              </h2>
              <p className="text-white/70 text-xl leading-relaxed">
                Join our waitlist and get early access when we launch in the UK.
              </p>
            </div>

            <form
              name="waitlist"
              method="POST"
              data-netlify="true"
              data-netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="form-name" value="waitlist" />
              <div hidden aria-hidden="true">
                <label>
                  Don't fill this out: <input name="bot-field" tabIndex={-1} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-white/70 text-sm font-medium mb-1.5">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    placeholder="Jane Smith"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-amber/60 transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-white/70 text-sm font-medium mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    placeholder="jane@example.co.uk"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-amber/60 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="interest" className="block text-white/70 text-sm font-medium mb-1.5">
                  I'm most interested in
                </label>
                <select
                  id="interest"
                  name="interest"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-amber/60 transition appearance-none"
                >
                  <option value="" className="text-slate-800 bg-white">
                    Select an option
                  </option>
                  <option value="spark" className="text-slate-800 bg-white">
                    Spark — investing for my child
                  </option>
                  <option value="launchpad" className="text-slate-800 bg-white">
                    Launchpad — saving for a first home
                  </option>
                  <option value="both" className="text-slate-800 bg-white">
                    Both products
                  </option>
                  <option value="not-sure" className="text-slate-800 bg-white">
                    Not sure yet
                  </option>
                </select>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-amber text-brand-navy font-semibold py-4 rounded-xl hover:bg-amber-400 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? 'Joining...' : 'Join the waitlist'}
              </button>

              <p className="text-white/40 text-sm text-center">
                No spam, ever. We'll only email you about Amplifi.
              </p>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
