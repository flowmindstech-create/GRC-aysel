'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, X } from 'lucide-react'

interface Props {
  strategyLabel: string
  levelWord: string
  canApprove: boolean
  onApprove: (note: string) => void
  onClose: () => void
}

/**
 * Executive-director approval gate. A treatment forbidden by the matrix for the
 * current risk level can only be selected if an admin/risk_manager approves with
 * a written justification.
 */
export function ExecutiveApprovalModal({ strategyLabel, levelWord, canApprove, onApprove, onClose }: Props) {
  const [note, setNote] = useState('')
  const sty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>İcraçı Direktor Təsdiqi</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-amber-400">{strategyLabel}</strong> strategiyası <strong>{levelWord}</strong> risk səviyyəsi üçün metodologiya cədvəlinə görə <strong>qadağandır (×)</strong>. Seçim yalnız icraçı direktor təsdiqi ilə qüvvəyə minir.
          </p>

          {!canApprove ? (
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Bu seçimi yalnız <strong>admin</strong> və ya <strong>risk_manager</strong> rolu təsdiq edə bilər.
            </p>
          ) : (
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Əsaslandırma *</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="Bu istisnanın səbəbini yazın…"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30 resize-none" style={sty} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ color: 'var(--muted-fg)' }}>İmtina et</button>
          <button
            onClick={() => onApprove(note.trim())}
            disabled={!canApprove || !note.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Təsdiqləyirəm
          </button>
        </div>
      </motion.div>
    </div>
  )
}
