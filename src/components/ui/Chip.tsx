import { cn } from '@/lib/cn'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
}

/** Toggle chip. 44px tall tap target. */
export function Chip({ pressed = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm font-medium transition-colors',
        pressed ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white text-ink hover:bg-brand-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function ChipGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  )
}
