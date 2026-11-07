import { BookOpen, Bookmark, Home, Plus, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/places', label: 'Places', icon: BookOpen },
  { to: '/log', label: 'Log', icon: Plus, primary: true },
  { to: '/want', label: 'Want', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function TabBar() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end, primary }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold',
                  isActive ? 'text-brand-700' : 'text-muted',
                )
              }
            >
              {primary ? (
                <span className="-my-1.5 flex size-8 items-center justify-center rounded-full bg-brand-700 text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              ) : (
                <Icon aria-hidden="true" className="size-5" />
              )}
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
