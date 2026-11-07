import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-4 flex min-h-11 items-center gap-2">
      {back && (
        <Link to={back} aria-label="Back" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-brand-100">
          <ChevronLeft aria-hidden="true" className="size-6" />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{title}</h1>
      {action}
    </header>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}
