import type { Tag } from '../types'

const t = (kind: Tag['kind'], label: string): Tag => ({ id: label.replace(/\s+/g, '-'), kind, label })

export const TAGS: Tag[] = [
  t('occasion', 'date night'),
  t('occasion', 'groups'),
  t('occasion', 'solo'),
  t('occasion', 'family'),
  t('occasion', 'impress visitors'),
  t('occasion', 'brunch'),
  t('occasion', 'late night'),
  t('occasion', 'quick bite'),
  t('vibe', 'cozy'),
  t('vibe', 'lively'),
  t('vibe', 'outdoor'),
]
