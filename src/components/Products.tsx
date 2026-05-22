export default function Products() {
  return (
    <section id="products" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-navy mb-5 tracking-tight">
            Two products. One family.
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Whether you're planting the seed for your child or your child is ready to take the next step — Amplifi has you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Spark card */}
          <div className="bg-white rounded-2xl p-8 md:p-10 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6 text-2xl">
              ✨
            </div>
            <div className="inline-block bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-5">
              For parents &amp; grandparents
            </div>
            <h3 className="text-3xl font-bold text-brand-navy mb-4">Spark</h3>
            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
              A long-term investment pot that grows alongside your child. Contribute regularly, invest wisely, and let compound growth do the hard work — over years, not months.
            </p>
            <ul className="space-y-3.5 text-slate-600">
              {[
                'Start from as little as £10 per month',
                'ISA-wrapper compatible',
                'Multiple family members can contribute',
                'Beautiful long-term growth projections',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-brand-teal font-bold mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Launchpad card */}
          <div className="bg-brand-navy rounded-2xl p-8 md:p-10 shadow-sm">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-2xl">
              🚀
            </div>
            <div className="inline-block bg-white/10 text-white/70 text-sm font-medium px-3 py-1 rounded-full mb-5">
              For young adults (18+)
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Launchpad</h3>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              Turn years of family saving into a first-home deposit. Launchpad bridges the gap between childhood savings and property ownership with structured, goal-based planning.
            </p>
            <ul className="space-y-3.5 text-white/70">
              {[
                'Set a clear property deposit goal',
                'Seamlessly linked to your Spark pot',
                'First-time buyer strategies built in',
                'LISA-compatible planning tools',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-brand-amber font-bold mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
