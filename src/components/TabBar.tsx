import { BookOpen, Bookmark, Home, Plus, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

// Design: Figma "Recd app screens" > TabBar (node 9:2). The center "Log" action is an
// icon-only 44px circle, so its accessible name comes from aria-label.
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
              aria-label={primary ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-0.5 px-1',
                  isActive ? 'text-brand-700' : 'text-muted',
                )
              }
            >
              {primary ? (
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-700 text-white">
                  <Icon aria-hidden="true" className="size-[27.5px]" />
                </span>
              ) : (
                <>
                  <Icon aria-hidden="true" className="size-5" />
                  <span className="h-6 text-base leading-6 font-normal whitespace-nowrap">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
