import { type VariantProps, cva } from 'class-variance-authority'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

export const buttonStyles = cva(
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-700 text-white hover:bg-orange-800 active:bg-orange-900',
        secondary: 'border border-line bg-white text-ink hover:bg-brand-50',
        ghost: 'text-brand-700 hover:bg-brand-100',
        danger: 'border border-red-300 bg-white text-red-800 hover:bg-red-50',
      },
      size: { md: '', lg: 'min-h-14 rounded-2xl px-6 text-lg', sm: 'text-sm' },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

type Styles = VariantProps<typeof buttonStyles>

export function Button({
  variant, size, block, className, type = 'button', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & Styles) {
  return <button type={type} className={cn(buttonStyles({ variant, size, block }), className)} {...props} />
}

export function LinkButton({ variant, size, block, className, ...props }: LinkProps & Styles) {
  return <Link className={cn(buttonStyles({ variant, size, block }), className)} {...props} />
}

export function ExternalLink({ variant = 'secondary', size, block, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & Styles) {
  return <a target="_blank" rel="noopener noreferrer" className={cn(buttonStyles({ variant, size, block }), className)} {...props} />
}
