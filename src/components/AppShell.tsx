import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/data'
import { TabBar } from './TabBar'

export function AppShell() {
  const session = useSession()
  const loc = useLocation()
  if (!session) return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search }} />
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        <Outlet />
      </main>
      <TabBar />
    </>
  )
}
