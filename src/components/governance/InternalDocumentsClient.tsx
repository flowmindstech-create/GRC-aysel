'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import type { InternalDocument, InternalDocType, OrgUnit, UserProfile } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'

export const DOC_TYPE_CFG: Record<InternalDocType, { label: string; cls: string }> = {
  policy:      { label: 'Siyasət',      cls: 'bg-indigo-500/15 text-indigo-400' },
  rule:        { label: 'Qayda',        cls: 'bg-sky-500/15 text-sky-400' },
  procedure:   { label: 'Prosedur',     cls: 'bg-emerald-500/15 text-emerald-400' },
  instruction: { label: 'Təlimat',      cls: 'bg-amber-500/15 text-amber-400' },
  charter:     { label: 'Əsasnamə',     cls: 'bg-violet-500/15 text-violet-400' },
  methodology: { label: 'Metodologiya', cls: 'bg-teal-500/15 text-teal-400' },
  other:       { label: 'Digər',        cls: 'bg-zinc-500/15 text-zinc-400' },
}

function DocumentFormDialog({ doc, departments, profiles, onClose, onSave }: {
  doc: InternalDocument | null
  departments: OrgUnit[]
  profiles: UserProfile[]
  onClose: () => void
  onSave: (d: InternalDocument) => Promise<void>
}) {
  const isEdit = !!doc
  const [name, setName] = useState(doc?.name ?? '')
  const [docType, setDocType] = useState<InternalDocType>(doc?.doc_type ?? 'policy')
  const [docNumber, setDocNumber] = useState(doc?.doc_number ?? '')
  const [version, setVersion] = useState(doc?.version ?? '1.0')
  const [effectiveDate, setEffectiveDate] = useState(doc?.effective_date?.slice(0, 10) ?? '')
  const [approvedBy, setApprovedBy] = useState(doc?.approved_by ?? '')
  const [authorDept, setAuthorDept] = useState(doc?.author_dept ?? '')
  const [participantDepts, setParticipantDepts] = useState<string[]>(doc?.participant_depts ?? [])
  const [loading, setLoading] = useState(false)

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: doc?.id ?? crypto.randomUUID(),
      org_id: doc?.org_id ?? '',
      doc_uid: doc?.doc_uid ?? '',
      name: name.trim(),
      doc_type: docType,
      doc_number: docNumber.trim() || undefined,
      version: version.trim() || '1.0',
      effective_date: effectiveDate || undefined,
      approved_by: approvedBy.trim() || undefined,
      author_dept: authorDept.trim() || undefined,
      participant_depts: participantDepts,
      created_at: doc?.created_at ?? now,
      updated_at: now,
    })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }} className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Sənədi redaktə et' : 'Yeni Daxili Sənəd'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                {isEdit ? `Unikal ID: ${doc.doc_uid}` : 'Unikal ID avtomatik veriləcək (DOC-…)'}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Sənədin adı <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="məs. İnformasiya Təhlükəsizliyi Qaydaları"
                className={fieldCls} style={inputStyle} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Sənəd növü</label>
                <select value={docType} onChange={e => setDocType(e.target.value as InternalDocType)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(DOC_TYPE_CFG) as InternalDocType[]).map(t => <option key={t} value={t}>{DOC_TYPE_CFG[t].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Sənəd nömrəsi</label>
                <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="məs. QN-2026/14" className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Versiya</label>
                <input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0" className={fieldCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Qüvvəyə minmə tarixi</label>
                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Təsdiqləyən rəhbər</label>
                <select value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {profiles.map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Tərtib edən struktur</label>
                <select value={authorDept} onChange={e => setAuthorDept(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {/* Participant structures — dropdown + chips */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>İştirakçı strukturlar</label>
              <select value=""
                onChange={e => {
                  const v = e.target.value
                  if (v && !participantDepts.includes(v)) setParticipantDepts([...participantDepts, v])
                }}
                className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— Struktur əlavə et —</option>
                {departments.filter(d => !participantDepts.includes(d.name)).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              {participantDepts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {participantDepts.map(n => (
                    <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'var(--brand-500)', color: '#fff' }}>
                      {n}
                      <button type="button" aria-label={`${n} sil`}
                        onClick={() => setParticipantDepts(participantDepts.filter(x => x !== n))}
                        className="hover:opacity-80 font-bold leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Ləğv et</button>
              <button type="submit" disabled={!name.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saxlanılır…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Yenilə' : 'Yarat'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Main register ─────────────────────────────────────────────────────────────
export function InternalDocumentsClient() {
  const { can } = usePermissions()
  const [docs, setDocs] = useState<InternalDocument[]>([])
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InternalDocument | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [data, units, people] = await Promise.all([
      dbExt.getInternalDocuments(), db.getOrgUnits(), db.getProfiles(),
    ])
    setDocs(data)
    setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    setProfiles(people)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => docs.filter(d =>
    !search
    || (d.name ?? '').toLowerCase().includes(search.toLowerCase())
    || (d.doc_uid ?? '').toLowerCase().includes(search.toLowerCase())
    || (d.doc_number ?? '').toLowerCase().includes(search.toLowerCase())
  ), [docs, search])

  async function handleSave(item: InternalDocument) {
    await dbExt.saveInternalDocument(item)
    setShowForm(false); setEditItem(null)
    reload()
    toast.success(editItem ? 'Sənəd yeniləndi' : 'Sənəd yaradıldı')
  }

  async function handleDelete(id: string) {
    await dbExt.deleteInternalDocument(id)
    setMenuOpen(null)
    reload()
    toast.success('Sənəd silindi')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sənəd axtar (ad / ID / nömrə)…" aria-label="Search documents"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> Yeni Sənəd
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Unikal ID', 'Sənədin adı', 'Növü', 'Nömrəsi', 'Versiya', 'Qüvvəyə minmə', 'Təsdiqləyən rəhbər', 'Tərtib edən struktur', 'İştirakçı strukturlar', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                  <div className="flex flex-col items-center gap-2"><FileText className="w-8 h-8 opacity-30" /><p className="text-sm">Hələ ki daxili sənəd yoxdur</p><p className="text-xs opacity-60">Reyestrə ilk sənədi əlavə edin</p></div>
                </td></tr>
              ) : (
                filtered.map((d, i) => {
                  const tp = DOC_TYPE_CFG[d.doc_type ?? 'other']
                  return (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{d.doc_uid}</span></td>
                    <td className="px-3 py-3.5 max-w-[220px]"><span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{d.name}</span></td>
                    <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', tp.cls)}>{tp.label}</span></td>
                    <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: d.doc_number ? 'var(--foreground)' : 'var(--muted-fg)' }}>{d.doc_number || '—'}</span></td>
                    <td className="px-3 py-3.5"><span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/12 text-sky-400">v{d.version}</span></td>
                    <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: d.effective_date ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                      {d.effective_date ? new Date(d.effective_date).toLocaleDateString('az-AZ') : '—'}</span></td>
                    <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: d.approved_by ? 'var(--foreground)' : 'var(--muted-fg)' }}>{d.approved_by || '—'}</span></td>
                    <td className="px-3 py-3.5 max-w-[170px]"><span className="text-xs" style={{ color: d.author_dept ? 'var(--foreground)' : 'var(--muted-fg)' }}>{d.author_dept || '—'}</span></td>
                    <td className="px-3 py-3.5 max-w-[190px]">
                      {(d.participant_depts ?? []).length === 0 ? <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span> : (
                        <span className="inline-flex flex-wrap gap-1">
                          {(d.participant_depts ?? []).slice(0, 2).map(n => (
                            <span key={n} className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-violet-500/12 text-violet-400">{n}</span>
                          ))}
                          {(d.participant_depts ?? []).length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{(d.participant_depts ?? []).length - 2}</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === d.id ? null : d.id) }} aria-label="Document actions"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                        </button>
                        {menuOpen === d.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-20 border py-1" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditItem(d); setShowForm(true); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                              <Edit className="w-3.5 h-3.5" /> Redaktə
                            </button>
                            {can('delete') && <button onClick={() => handleDelete(d.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                              <Trash2 className="w-3.5 h-3.5" /> Sil
                            </button>}
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <DocumentFormDialog key={editItem?.id ?? 'new'} doc={editItem} departments={departments} profiles={profiles}
          onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />
      )}
    </div>
  )
}
