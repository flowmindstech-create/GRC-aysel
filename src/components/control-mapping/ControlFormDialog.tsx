'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Control, ControlFramework, ControlType, ExecutionFrequency, UserProfile } from '@/types'
import { db } from '@/lib/db'
import { generateControlCode } from '@/lib/control-id'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'

const TYPES: ControlType[] = ['preventive', 'detective', 'corrective', 'directive']
const FREQS: ExecutionFrequency[] = ['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc']
const COMPLIANCE_FRAMEWORKS: ControlFramework[] = ['iso27001', 'soc2', 'gdpr', 'pci_dss']

interface Props {
  control: Control | null
  existing: Control[]
  onClose: () => void
  onSave: (c: Control) => void
}

const inputCls = 'w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30'

export function ControlFormDialog({ control, existing, onClose, onSave }: Props) {
  const { can } = usePermissions()
  const isEdit = !!control
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [isCompliance, setIsCompliance] = useState((control?.framework ?? 'custom') !== 'custom')
  const [form, setForm] = useState<Control>(
    control ?? {
      id: `c-${Date.now()}`,
      org_id: 'org1',
      framework: 'custom',
      control_id: generateControlCode(existing),
      title: '',
      description: '',
      status: 'na',
      control_type: 'preventive',
      execution_frequency: 'monthly',
      created_at: new Date().toISOString(),
    }
  )

  useEffect(() => { db.getProfiles().then(setProfiles) }, [])

  const set = (patch: Partial<Control>) => setForm((f) => ({ ...f, ...patch }))
  const sty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Kontrol adı tələb olunur'); return }
    const record: Control = {
      ...form,
      framework: isCompliance ? (COMPLIANCE_FRAMEWORKS.includes(form.framework) ? form.framework : 'iso27001') : 'custom',
      control_id: form.control_id?.trim() || generateControlCode(existing),
      // GRC qaydası: yeni kontrol super_admin yaradıbsa dərhal approved,
      // başqası yaradıbsa pending_review (super_admin təsdiqini gözləyir)
      approval_status: control?.approval_status ?? (can('approve') ? 'approved' : 'pending_review'),
      updated_at: new Date().toISOString(),
    }
    try {
      const saved = await db.saveControl(record)
      onSave(saved)
      toast.success(`Kontrol ${saved.control_id} saxlanıldı`)
    } catch {
      toast.error('Kontrol saxlanmadı')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Kontrolu redaktə et' : 'Yeni Kontrol (Library)'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Kontrol ID</label>
              <input value={form.control_id} onChange={(e) => set({ control_id: e.target.value })} className={cn(inputCls, 'font-mono')} style={sty} />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Kontrol tipi</label>
              <select value={form.control_type ?? 'preventive'} onChange={(e) => set({ control_type: e.target.value as ControlType })} className={inputCls} style={sty}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Kontrol adı *</label>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="məs. Çox faktorlu autentifikasiya" className={inputCls} style={sty} />
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Kontrol izahı</label>
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} style={sty} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Kontrol sahibi</label>
              <select value={form.owner_id ?? ''} onChange={(e) => set({ owner_id: e.target.value || undefined })} className={inputCls} style={sty}>
                <option value="">— Təyin edilməyib —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>İcra tezliyi</label>
              <select value={form.execution_frequency ?? 'monthly'} onChange={(e) => set({ execution_frequency: e.target.value as ExecutionFrequency })} className={inputCls} style={sty}>
                {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Evidence (icranı sübut edən göstərici)</label>
            <input value={form.evidence_requirements ?? ''} onChange={(e) => set({ evidence_requirements: e.target.value })} placeholder="məs. Aylıq giriş loqları, audit hesabatı" className={inputCls} style={sty} />
          </div>

          {/* Compliance toggle */}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--foreground)' }}>
              <input type="checkbox" checked={isCompliance} onChange={(e) => setIsCompliance(e.target.checked)} className="h-4 w-4" />
              Compliance ilə bağlıdır
            </label>
            {isCompliance ? (
              <select value={COMPLIANCE_FRAMEWORKS.includes(form.framework) ? form.framework : 'iso27001'} onChange={(e) => set({ framework: e.target.value as ControlFramework })} className={cn(inputCls, 'max-w-[180px]')} style={sty}>
                {COMPLIANCE_FRAMEWORKS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            ) : (
              <span className="text-[11px] text-slate-500">Custom (non-compliance) kontrol</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ color: 'var(--muted-fg)' }}>Ləğv et</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer">Saxla</button>
        </div>
      </motion.div>
    </div>
  )
}
