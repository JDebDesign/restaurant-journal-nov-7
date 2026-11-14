import { BookOpen, Bookmark, Home, Plus, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

// Design: Figma "Recd app screens" > TabBar (node 9:2). The center "Log" action is an
// icon-only 44px circle, so its accessible name comes from aria-label. Its pressed-state
// motion is Figma nodes 9:21 / 9:22 (keyframes in index.css).
const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/places', label: 'Places', icon: BookOpen },
  { to: '/log', label: 'Log', icon: Plus, primary: true },
  { to: '/want', label: 'Want', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Replays the Log button's pressed-state motion (CSS in index.css), restarting it if it is mid-flight. */
function playPress(link: HTMLElement) {
  link.querySelectorAll<HTMLElement>('.press-pop, .press-spin').forEach((el) => {
    el.classList.remove('is-pressed')
    el.getBoundingClientRect() // flush styles so re-adding the class restarts the animation
    el.classList.add('is-pressed')
  })
}

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
              onPointerDown={primary ? (e) => playPress(e.currentTarget) : undefined}
              onKeyDown={primary ? (e) => (e.key === 'Enter' || e.key === ' ') && playPress(e.currentTarget) : undefined}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-0.5 px-1',
                  isActive ? 'text-brand-700' : 'text-muted',
                )
              }
            >
              {primary ? (
                <span className="press-pop flex size-11 items-center justify-center rounded-full bg-brand-700 text-white">
                  <Icon aria-hidden="true" className="press-spin size-[27.5px]" />
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
