import { cn } from '@/lib/utils'

// Circular initials avatar with a deterministic colour derived from the name.
const PALETTE = [
  'bg-indigo-500/15 text-indigo-600',
  'bg-teal-500/15 text-teal-600',
  'bg-rose-500/15 text-rose-600',
  'bg-amber-500/15 text-amber-600',
  'bg-sky-500/15 text-sky-600',
  'bg-violet-500/15 text-violet-600',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const tone = PALETTE[hash(name) % PALETTE.length]
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-bold shrink-0', tone, className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}
