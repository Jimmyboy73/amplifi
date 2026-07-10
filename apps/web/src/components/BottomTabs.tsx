import { Link } from 'react-router-dom'

// The app's three-tab bottom bar (Home · My Family · Occasions). Fixed to the bottom;
// screens that use it pad their content with pb-24 to clear it.
const CORE = '#2F6FC4'

export type TabKey = 'home' | 'family' | 'occasions'

const TABS: { key: TabKey; label: string; icon: string; to: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠', to: '/home' },
  { key: 'family', label: 'My Family', icon: '👪', to: '/family' },
  { key: 'occasions', label: 'Occasions', icon: '🎁', to: '/occasions' },
]

export function BottomTabs({ active }: { active: TabKey }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition"
            style={{ color: t.key === active ? CORE : '#94a3b8' }}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
