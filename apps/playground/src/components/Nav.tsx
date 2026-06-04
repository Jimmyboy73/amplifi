import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-midnight tracking-tight">
            amplifi
          </a>
          <div className="flex items-center gap-3">
            <Link
              to="/plan"
              className="hidden sm:inline-flex items-center text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors"
            >
              See what your child could have
            </Link>
            <a
              href="#waitlist"
              className="bg-midnight text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-midnight/90 transition-colors"
            >
              Join the waitlist
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
