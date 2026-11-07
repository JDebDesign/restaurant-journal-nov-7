import { ImageIcon } from 'lucide-react'
import { usePhotoUrl } from '@/hooks/data'
import { cn } from '@/lib/cn'

export function PhotoThumb({ id, className, alt = '' }: { id?: string; className?: string; alt?: string }) {
  const { data: url } = usePhotoUrl(id)
  if (!id || !url) {
    return (
      <div aria-hidden="true" className={cn('flex items-center justify-center bg-brand-100 text-brand-700', className)}>
        <ImageIcon className="size-6" />
      </div>
    )
  }
  return <img src={url} alt={alt} loading="lazy" className={cn('object-cover', className)} />
}
