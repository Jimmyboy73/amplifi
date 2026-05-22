export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-brand-navy tracking-tight">
            amplifi
          </a>
          <a
            href="#waitlist"
            className="bg-brand-navy text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-navy/90 transition-colors"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </nav>
  )
}
