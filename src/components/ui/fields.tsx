import { useId } from 'react'
import { cn } from '@/lib/cn'

const base =
  'min-h-11 w-full rounded-xl border border-line bg-white px-4 text-base placeholder:text-stone-500 focus-visible:border-brand-700'

export function TextField({
  label, hideLabel, className, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hideLabel?: boolean }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={cn('mb-1 block text-sm font-semibold', hideLabel && 'sr-only')}>{label}</label>
      <input id={id} className={cn(base, className)} {...props} />
    </div>
  )
}

export function TextArea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <textarea id={id} className={cn(base, 'min-h-24 py-3', className)} {...props} />
    </div>
  )
}

export function SelectField({
  label, className, children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <select id={id} className={cn(base, className)} {...props}>{children}</select>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 text-left font-medium"
    >
      <span>{label}</span>
      <span className={cn('flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-brand-700' : 'bg-stone-400')}>
        <span className={cn('size-6 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
      </span>
    </button>
  )
}
