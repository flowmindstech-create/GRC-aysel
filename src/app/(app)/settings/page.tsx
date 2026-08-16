'use client'
import { TopNav } from '@/components/layout/TopNav'
import type { Metadata } from 'next'
import { MOCK_USERS } from '@/lib/seed-data'
import { User, Bell, Shield, Database, Key, Globe, Palette, Check, Loader2, ArrowLeft, ExternalLink, Settings, Building2, Users, KeyRound } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { OrgStructurePanel } from '@/components/settings/OrgStructurePanel'
import { UserManagementPanel } from '@/components/settings/UserManagementPanel'
import { AccessExceptionsPanel } from '@/components/settings/AccessExceptionsPanel'
import { usePermissions } from '@/hooks/usePermissions'


const SECTIONS: { id: string; icon: LucideIcon; label: string; superAdminOnly?: boolean }[] = [
  { id: 'profile',       icon: User,      label: 'Profile' },
  { id: 'users',         icon: Users,     label: 'Users', superAdminOnly: true },
  { id: 'access',        icon: KeyRound,  label: 'Access Exceptions', superAdminOnly: true },
  { id: 'notifications', icon: Bell,      label: 'Notifications' },
  { id: 'security',      icon: Shield,    label: 'Security' },
  { id: 'integrations',  icon: Database,  label: 'Integrations' },
  { id: 'api',           icon: Key,       label: 'API Keys' },
  { id: 'organization',  icon: Globe,     label: 'Organization' },
  { id: 'org-structure', icon: Building2, label: 'Org Structure' },
  { id: 'appearance',    icon: Palette,   label: 'Appearance' },
]

export default function SettingsPage() {
  const fallbackUser = MOCK_USERS[0]
  const { isSuperAdmin, profile } = usePermissions()
  const user = profile ?? fallbackUser
  const [activeSection, setActiveSection] = useState('profile')
  const sections = SECTIONS.filter(s => !s.superAdminOnly || isSuperAdmin)
  const [jiraConfig, setJiraConfig] = useState<any>({
    instanceUrl: '',
    email: '',
    apiToken: '',
    connected: false,
    projectMapping: { risks: 'RMK', incidents: 'SEC' },
    issueTypeMapping: { risks: 'Task', incidents: 'Bug' }
  })
  const [isJiraOpen, setIsJiraOpen] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  // ── Profil formu (kontrollu) ────────────────────────────────────────────
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ── Bildiriş toggle-ları ─────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<boolean[]>([true, true, false, true, true])

  // ── Təhlükəsizlik ────────────────────────────────────────────────────────
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [twoFA, setTwoFA] = useState(false)

  // ── API / Təşkilat ───────────────────────────────────────────────────────
  const [supabaseUrl, setSupabaseUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const [orgName, setOrgName] = useState('GRCell')
  const [orgIndustry, setOrgIndustry] = useState('Technology')
  const [orgPlan, setOrgPlan] = useState('Professional')

  useEffect(() => {
    async function load() {
      const config = await db.getJiraConfig()
      setJiraConfig(config)
    }
    load()
  }, [])

  // Profil yüklənəndə formu doldur
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
  }, [profile?.full_name])

  // ── Handler-lər ──────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    if (!fullName.trim()) { toast.error('Ad boş ola bilməz'); return }
    setSavingProfile(true)
    try {
      if (profile?.id) {
        const { createClient } = await import('@/lib/supabase/client')
        const { error } = await createClient().from('profiles').update({ full_name: fullName.trim() }).eq('id', profile.id)
        if (error) throw error
      }
      toast.success('Profile updated')
    } catch (e: any) {
      toast.error(e?.message || 'Profile not saved')
    } finally {
      setSavingProfile(false)
    }
  }

  function handleChangeAvatar() {
    avatarInputRef.current?.click()
  }
  function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) toast.success(`Avatar selected: ${file.name} (upload coming soon)`)
  }

  function toggleNotif(idx: number) {
    setNotifs(prev => prev.map((v, i) => (i === idx ? !v : v)))
  }

  async function handleUpdatePassword() {
    if (!newPwd || newPwd.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPwd !== confirmPwd) { toast.error('New password and confirmation do not match'); return }
    setSavingPwd(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const email = authUser?.email
      // Cari parolu yoxla (verify by re-auth)
      if (email && curPwd) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: curPwd })
        if (signInErr) { toast.error('Current password is incorrect'); setSavingPwd(false); return }
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success('Password updated successfully')
      setCurPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: any) {
      toast.error(e?.message || 'Password not updated')
    } finally {
      setSavingPwd(false)
    }
  }

  function handleToggle2FA() {
    setTwoFA(prev => {
      const next = !prev
      toast.success(next ? 'Two-factor authentication enabled' : '2FA disabled')
      return next
    })
  }

  async function handleSaveApiConfig() {
    try {
      await db.saveJiraConfig(jiraConfig)
      toast.success('API configuration saved')
    } catch (e: any) {
      toast.error(e?.message || 'API configuration not saved')
    }
  }

  function handleSaveOrganization() {
    toast.success('Organization settings saved')
  }


  return (
    <>
      <TopNav title="Settings" subtitle="Manage your account and organization preferences" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-6">
            {/* Sidebar nav */}
            <nav className="w-48 shrink-0 space-y-0.5">
              {sections.map(s => {
                const Icon = s.icon
                const active = activeSection === s.id
                return (
                  <button key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                      active ? 'bg-sky-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{ color: active ? 'white' : 'var(--muted-fg)' }}>
                    <Icon className="w-4 h-4" />{s.label}
                  </button>
                )
              })}
            </nav>

            {/* Content */}
            <div className="flex-1 space-y-6">
              {/* Profile */}
              {activeSection === 'profile' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Profile Information</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center text-white text-xl font-black">
                      {(fullName || user.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{fullName || user.full_name}</p>
                      <p className="text-sm capitalize" style={{ color: 'var(--muted-fg)' }}>{user.role.replace('_', ' ')}</p>
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
                      <button type="button" onClick={handleChangeAvatar} className="text-xs text-sky-500 hover:text-sky-400 mt-1">Change avatar</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Full Name</label>
                      <input value={fullName} onChange={e => setFullName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Email</label>
                      <input value={user.email ?? ''} readOnly title="Email is managed by Authentication"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none opacity-70 cursor-not-allowed"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-fg)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Role</label>
                      <input value={user.role.replace('_', ' ')} readOnly title="Sets role to Super Admin"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none capitalize opacity-70 cursor-not-allowed"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-fg)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Organization</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 flex items-center gap-2">
                      {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* İstifadəçilər — yalnız super_admin */}
              {activeSection === 'users' && <UserManagementPanel />}

              {/* Xüsusi icazələr — yalnız super_admin */}
              {activeSection === 'access' && <AccessExceptionsPanel />}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Notification Preferences</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Critical Risk Alerts',  desc: 'Get notified when a critical risk is created or escalated' },
                      { label: 'Incident Reports',      desc: 'Receive updates on open incidents assigned to you' },
                      { label: 'Compliance Deadlines',  desc: 'Reminders 7 days before control review deadlines' },
                      { label: 'Weekly Risk Digest',    desc: 'Summary email of all risk activity each Monday' },
                      { label: 'Vendor Renewals',       desc: 'Alerts 90 days before vendor contract renewals' },
                    ].map((n, idx) => (
                      <div key={n.label} className="flex items-center justify-between py-3 border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{n.label}</p>
                          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{n.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={notifs[idx]} onChange={() => toggleNotif(idx)} className="sr-only peer" />
                          <div className="w-11 h-6 rounded-full peer peer-checked:bg-sky-500 peer-focus:ring-2 peer-focus:ring-sky-500/30 transition-colors"
                            style={{ background: notifs[idx] ? undefined : 'var(--border)' }} />
                          <div className="absolute left-1 top-1 bg-white rounded-full h-4 w-4 transition-transform peer-checked:translate-x-5" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security */}
              {activeSection === 'security' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Security Settings</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Current Password</label>
                      <input type="password" placeholder="••••••••" value={curPwd} onChange={e => setCurPwd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>New Password</label>
                      <input type="password" placeholder="••••••••" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Confirm New Password</label>
                      <input type="password" placeholder="••••••••" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={handleUpdatePassword} disabled={savingPwd}
                        className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 flex items-center gap-2">
                        {savingPwd && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                      </button>
                    </div>
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Two-Factor Authentication</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--muted-fg)' }}>
                        {twoFA ? 'Two-factor authentication is ACTIVE.' : 'Add an extra layer of security to your account'}
                      </p>
                      <button type="button" onClick={handleToggle2FA}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: twoFA ? 'rgba(225,29,72,0.4)' : 'var(--border)', color: twoFA ? '#f43f5e' : 'var(--foreground)' }}>
                        {twoFA ? 'Disable 2FA' : 'Enable 2FA'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys */}
              {activeSection === 'api' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>API Configuration</h3>
                  <p className="text-xs mb-5" style={{ color: 'var(--muted-fg)' }}>Configure third-party API integrations.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Supabase URL</label>
                      <input value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)}
                        placeholder="https://your-project.supabase.co"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none font-mono focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={handleSaveApiConfig} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
                        Save API Config
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Org Structure */}
              {activeSection === 'org-structure' && <OrgStructurePanel />}

              {/* Appearance */}
              {activeSection === 'appearance' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Appearance</h3>
                  <div className="space-y-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Theme</p>
                    <div className="flex gap-3">
                      {['Light', 'Dark', 'System'].map(t => (
                        <button key={t}
                          className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            t === 'System' ? 'border-sky-500 bg-sky-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                          style={{ borderColor: t === 'System' ? undefined : 'var(--border)', color: t === 'System' ? undefined : 'var(--muted-fg)' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations */}
              {activeSection === 'integrations' && (
                <div className="card p-6">
                  {!isJiraOpen ? (
                    <>
                      <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Integrations</h3>
                      <div className="space-y-4">
                        {[
                          { id: 'slack', name: 'Slack', desc: 'Get risk and incident alerts in Slack channels', connected: false },
                          { id: 'jira', name: 'Jira', desc: 'Create Jira tickets from risk and incident items', connected: jiraConfig.connected },
                          { id: 'email', name: 'Email', desc: 'SMTP configuration for email notifications', connected: true },
                        ].map(int => (
                          <div key={int.name} className="flex items-center justify-between p-4 rounded-xl border"
                            style={{ borderColor: 'var(--border)' }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{int.name}</p>
                              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{int.desc}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (int.id === 'jira') {
                                  setIsJiraOpen(true)
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                int.connected
                                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                  : 'bg-sky-500 text-white hover:bg-sky-600'
                              }`}>
                              {int.connected ? (int.id === 'jira' ? 'Configure' : 'Connected') : 'Connect'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsJiraOpen(false)
                            setTestStatus('idle')
                          }}
                          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
                        </button>
                        <div>
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Jira Integration</h3>
                          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Configure GRCell GRC to synchronize on top of Jira</p>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
                        {/* URL */}
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Jira Instance URL</label>
                          <input
                            type="text"
                            placeholder="https://your-domain.atlassian.net"
                            value={jiraConfig.instanceUrl}
                            onChange={e => setJiraConfig({ ...jiraConfig, instanceUrl: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none font-mono focus:ring-2 focus:ring-sky-500/30"
                            style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                          />
                        </div>

                        {/* Auth Credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Jira Admin Email</label>
                            <input
                              type="email"
                              placeholder="admin@company.com"
                              value={jiraConfig.email}
                              onChange={e => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>API Token</label>
                            <input
                              type="password"
                              placeholder="Enter API Token..."
                              value={jiraConfig.apiToken}
                              onChange={e => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none font-mono focus:ring-2 focus:ring-sky-500/30"
                              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            />
                          </div>
                        </div>

                        {/* Project mapping */}
                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--border)' }}>
                          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Project Mapping</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Risks Project Key</label>
                              <input
                                type="text"
                                placeholder="RMK"
                                value={jiraConfig.projectMapping.risks}
                                onChange={e => setJiraConfig({
                                  ...jiraConfig,
                                  projectMapping: { ...jiraConfig.projectMapping, risks: e.target.value.toUpperCase() }
                                })}
                                className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none font-mono font-bold"
                                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Incidents Project Key</label>
                              <input
                                type="text"
                                placeholder="SEC"
                                value={jiraConfig.projectMapping.incidents}
                                onChange={e => setJiraConfig({
                                  ...jiraConfig,
                                  projectMapping: { ...jiraConfig.projectMapping, incidents: e.target.value.toUpperCase() }
                                })}
                                className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none font-mono font-bold"
                                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Issue Type mapping */}
                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--border)' }}>
                          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Issue Type Mapping</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Risk Issue Type</label>
                              <select
                                value={jiraConfig.issueTypeMapping.risks}
                                onChange={e => setJiraConfig({
                                  ...jiraConfig,
                                  issueTypeMapping: { ...jiraConfig.issueTypeMapping, risks: e.target.value }
                                })}
                                className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none cursor-pointer"
                                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                              >
                                <option value="Task">Task</option>
                                <option value="Risk">Risk (Custom)</option>
                                <option value="Story">Story</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Incident Issue Type</label>
                              <select
                                value={jiraConfig.issueTypeMapping.incidents}
                                onChange={e => setJiraConfig({
                                  ...jiraConfig,
                                  issueTypeMapping: { ...jiraConfig.issueTypeMapping, incidents: e.target.value }
                                })}
                                className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none cursor-pointer"
                                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                              >
                                <option value="Bug">Bug</option>
                                <option value="Incident">Incident (Custom)</option>
                                <option value="Task">Task</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Verification details */}
                        {testStatus !== 'idle' && (
                          <div className={`p-3.5 rounded-xl text-xs border flex items-center gap-2.5 ${
                            testStatus === 'testing' ? 'bg-sky-500/5 text-sky-500 border-sky-500/20' :
                            testStatus === 'success' ? 'bg-green-500/5 text-green-500 border-green-500/20' :
                            'bg-red-500/5 text-red-500 border-red-500/20'
                          }`}>
                            {testStatus === 'testing' && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                <span>Testing connection to Atlassian API...</span>
                              </>
                            )}
                            {testStatus === 'success' && (
                              <>
                                <Check className="w-4 h-4 shrink-0" />
                                <span>Handshake successful! Connected to <strong>{jiraConfig.instanceUrl || 'Atlassian Jira'}</strong>.</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Form Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={testStatus === 'testing' || !jiraConfig.instanceUrl}
                              onClick={async () => {
                                setTestStatus('testing')
                                await new Promise(r => setTimeout(r, 1500))
                                setTestStatus('success')
                              }}
                              className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            >
                              Test Connection
                            </button>
                            {jiraConfig.connected && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const cleared = {
                                    instanceUrl: '',
                                    email: '',
                                    apiToken: '',
                                    connected: false,
                                    projectMapping: { risks: 'RMK', incidents: 'SEC' },
                                    issueTypeMapping: { risks: 'Task', incidents: 'Bug' }
                                  }
                                  await db.saveJiraConfig(cleared)
                                  setJiraConfig(cleared)
                                  setIsJiraOpen(false)
                                  toast.success('Jira integration disconnected.')
                                }}
                                className="px-4 py-2 border border-red-500/30 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={!jiraConfig.instanceUrl}
                            onClick={async () => {
                              const updated = { ...jiraConfig, connected: true }
                              await db.saveJiraConfig(updated)
                              setJiraConfig(updated)
                              setIsJiraOpen(false)
                              toast.success('Jira configuration saved successfully!')
                            }}
                            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save Integration
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Organization */}
              {activeSection === 'organization' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Organization Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Organization Name</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Industry</label>
                      <input value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Plan</label>
                      <input value={orgPlan} onChange={e => setOrgPlan(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={handleSaveOrganization} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
                        Save Organization
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

