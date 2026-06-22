'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real error in the browser console for debugging
    console.error('Route error:', error)
  }, [error])

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-md gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Bu səhifə yüklənə bilmədi</h2>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Gözlənilməz xəta baş verdi. Yenidən cəhd et — problem davam edərsə, məlumat ver.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>ref: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg cursor-pointer transition-colors"
          style={{ background: 'var(--brand-500)' }}
        >
          <RotateCcw className="w-4 h-4" /> Yenidən yüklə
        </button>
      </div>
    </main>
  )
}
