'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import type { DashboardStats } from '@/types'
import { categoryLabel } from '@/lib/risk-categories'

interface Props { stats: DashboardStats }

export function RiskTrendChart({ stats }: Props) {
  const combined = stats.monthly_risks.map((r, i) => ({
    month: r.month,
    Risks: r.count,
    Incidents: stats.monthly_incidents[i]?.count ?? 0,
  }))

  return (
    <div className="card p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Risk & Incident Trends</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>Last 14 days (cumulative)</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={combined} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Risks" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradRisk)" dot={{ r: 3, fill: '#0ea5e9' }} />
          <Area type="monotone" dataKey="Incidents" stroke="#f97316" strokeWidth={2} fill="url(#gradInc)" dot={{ r: 3, fill: '#f97316' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RiskCategoryChart({ stats }: Props) {
  const data = Object.entries(stats.risk_by_category)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ category: categoryLabel(k), count: v }))

  const colors = ['#0ea5e9', '#f97316', '#eab308', '#22c55e', '#ec4899', '#14b8a6', '#0ea5e9']

  return (
    <div className="card p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Risks by Category</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>Distribution overview</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          {data.map((d, i) => (
            <Bar key={d.category} dataKey="count" fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

