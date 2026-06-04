export default function Footer() {
  return (
    <footer className="bg-slate-950 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-xl font-bold text-white tracking-tight">amplifi</span>
            <p className="text-slate-500 text-sm mt-1">Building the future of family wealth.</p>
          </div>
          <div className="text-slate-500 text-sm md:text-right max-w-md">
            <p>© 2026 Amplifi Ltd. All rights reserved.</p>
            <p className="mt-2 leading-relaxed">
              Amplifi is not yet authorised or regulated by the Financial Conduct Authority (FCA).
              Investing involves risk. Capital at risk. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
