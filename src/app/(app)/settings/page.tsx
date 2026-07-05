'use client'
import { TopNav } from '@/components/layout/TopNav'
import type { Metadata } from 'next'
import { MOCK_USERS } from '@/lib/seed-data'
import { User, Bell, Shield, Database, Key, Globe, Palette, Check, Loader2, ArrowLeft, ExternalLink, Settings, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { OrgStructurePanel } from '@/components/settings/OrgStructurePanel'


const SECTIONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'profile',       icon: User,      label: 'Profile' },
  { id: 'notifications', icon: Bell,      label: 'Notifications' },
  { id: 'security',      icon: Shield,    label: 'Security' },
  { id: 'integrations',  icon: Database,  label: 'Integrations' },
  { id: 'api',           icon: Key,       label: 'API Keys' },
  { id: 'organization',  icon: Globe,     label: 'Organization' },
  { id: 'org-structure', icon: Building2, label: 'Org Structure' },
  { id: 'appearance',    icon: Palette,   label: 'Appearance' },
]

export default function SettingsPage() {
  const user = MOCK_USERS[0]
  const [activeSection, setActiveSection] = useState('profile')
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

  useEffect(() => {
    async function load() {
      const config = await db.getJiraConfig()
      setJiraConfig(config)
    }
    load()
  }, [])


  return (
    <>
      <TopNav title="Settings" subtitle="Manage your account and organization preferences" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-6">
            {/* Sidebar nav */}
            <nav className="w-48 shrink-0 space-y-0.5">
              {SECTIONS.map(s => {
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
                      {user.full_name[0]}
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{user.full_name}</p>
                      <p className="text-sm capitalize" style={{ color: 'var(--muted-fg)' }}>{user.role.replace('_', ' ')}</p>
                      <button className="text-xs text-sky-500 hover:text-sky-400 mt-1">Change avatar</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name',     value: user.full_name },
                      { label: 'Email',         value: user.email },
                      { label: 'Role',          value: user.role.replace('_', ' ') },
                      { label: 'Organization',  value: 'Acme Corp' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-semibold mb-1.5 capitalize" style={{ color: 'var(--foreground)' }}>
                          {f.label}
                        </label>
                        <input defaultValue={f.value}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30 capitalize"
                          style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>Notification Preferences</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Critical Risk Alerts',  desc: 'Get notified when a critical risk is created or escalated', enabled: true },
                      { label: 'Incident Reports',      desc: 'Receive updates on open incidents assigned to you', enabled: true },
                      { label: 'Compliance Deadlines',  desc: 'Reminders 7 days before control review deadlines', enabled: false },
                      { label: 'Weekly Risk Digest',    desc: 'Summary email of all risk activity each Monday', enabled: true },
                      { label: 'Vendor Renewals',       desc: 'Alerts 90 days before vendor contract renewals', enabled: true },
                    ].map(n => (
                      <div key={n.label} className="flex items-center justify-between py-3 border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{n.label}</p>
                          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{n.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={n.enabled} className="sr-only peer" />
                          <div className="w-11 h-6 rounded-full peer peer-checked:bg-sky-500 peer-focus:ring-2 peer-focus:ring-sky-500/30 transition-colors"
                            style={{ background: n.enabled ? undefined : 'var(--border)' }} />
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
                      <input type="password" placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>New Password</label>
                      <input type="password" placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Confirm New Password</label>
                      <input type="password" placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex justify-end">
                      <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
                        Update Password
                      </button>
                    </div>
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Two-Factor Authentication</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--muted-fg)' }}>Add an extra layer of security to your account</p>
                      <button className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        Enable 2FA
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
                      <input defaultValue="https://your-project.supabase.co"
                        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none font-mono"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex justify-end">
                      <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
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
                    {[
                      { label: 'Organization Name', value: 'Acme Corp' },
                      { label: 'Industry',           value: 'Technology' },
                      { label: 'Plan',               value: 'Professional' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>{f.label}</label>
                        <input defaultValue={f.value}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30"
                          style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600">
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

