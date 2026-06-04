import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative bg-midnight min-h-screen flex items-center overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-sky/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-amber/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/2 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-36 md:pt-40">
        <div className="max-w-3xl">
          {/* Launch badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm px-4 py-2 rounded-full mb-8 border border-white/20">
            <span className="w-2 h-2 bg-amber rounded-full animate-pulse flex-shrink-0" />
            Launching soon in the UK
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
            Build your child's{' '}
            <span className="text-sky">financial future</span>{' '}
            together.
          </h1>

          {/* Subtext */}
          <p className="text-xl text-white/70 max-w-2xl mb-10 leading-relaxed">
            Amplifi helps UK parents and grandparents invest for the long term — from a child's first pound to their first home deposit. Start small. Think decades. Build together.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/plan"
              className="inline-flex items-center justify-center bg-sky text-midnight font-bold px-8 py-4 rounded-xl hover:bg-sky/90 transition-colors text-lg shadow-lg shadow-sky/20"
            >
              See what your child could have
            </Link>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center bg-amber text-midnight font-semibold px-8 py-4 rounded-xl hover:bg-amber/90 transition-colors text-lg"
            >
              Join the waitlist
            </a>
            <a
              href="#products"
              className="inline-flex items-center justify-center text-white/80 border border-white/20 font-medium px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-lg"
            >
              Learn how it works
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-16 flex flex-wrap gap-x-8 gap-y-3 text-white/50 text-sm">
            <span>🇬🇧 UK-only platform</span>
            <span>🔒 FCA authorisation pending</span>
            <span>💷 ISA-wrapper friendly</span>
          </div>
        </div>
      </div>
    </section>
  )
}
