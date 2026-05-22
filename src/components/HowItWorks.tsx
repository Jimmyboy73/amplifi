const steps = [
  {
    number: '01',
    title: 'Create your family account',
    description:
      "Sign up in minutes. Add family members — parents, grandparents, even aunts and uncles can all contribute towards the same child.",
  },
  {
    number: '02',
    title: 'Choose your products',
    description:
      "Start with Spark to invest for your child today. Add Launchpad when they're ready to plan their first property purchase.",
  },
  {
    number: '03',
    title: 'Watch it grow together',
    description:
      "Track your pot's growth with beautiful projections. See how today's £10 becomes tomorrow's opportunity — one month at a time.",
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-navy mb-5 tracking-tight">
            Simple by design
          </h2>
          <p className="text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
            Building your child's future shouldn't be complicated. We've made it as straightforward as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-7xl font-extrabold text-slate-100 mb-4 leading-none select-none">
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-brand-navy mb-3">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
