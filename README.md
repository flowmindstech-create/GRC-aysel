# RiskShield IRM — AI-Powered Integrated Risk Management

> Lightweight, AI-powered alternative to Archer IRM for small and medium businesses.

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd maliyye
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `OPENAI_API_KEY` — from platform.openai.com

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Paste and run `supabase-schema.sql`
4. Enable Email auth in **Authentication → Providers**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password
│   ├── (app)/           # Protected app routes
│   │   ├── dashboard/   # Main dashboard
│   │   ├── risks/       # Risk management
│   │   ├── incidents/   # Incident management
│   │   ├── compliance/  # Compliance controls
│   │   ├── audits/      # Audit management
│   │   ├── vendors/     # Vendor risk
│   │   └── settings/    # User & org settings
│   └── page.tsx         # Landing page
├── components/
│   ├── layout/          # Sidebar, TopNav, AppShell
│   ├── dashboard/       # KPI cards, charts, heatmap
│   ├── risks/           # Risk table, form, detail sheet
│   ├── incidents/       # Incident cards, form, timeline
│   ├── compliance/      # Control checklist
│   ├── audits/          # Audit accordion, findings
│   ├── vendors/         # Vendor table with AI summary
│   └── shared/          # Badges, PageHeader, EmptyState
├── lib/
│   ├── supabase/        # Client, server, middleware
│   ├── seed-data.ts     # Mock data
│   └── utils.ts         # cn() helper
└── types/index.ts       # All TypeScript types
```

---

## ✨ Features

| Module | Features |
|--------|----------|
| **Auth** | Login, Register, Role-based (Admin/Risk Manager/Auditor/Employee) |
| **Dashboard** | KPI cards, Risk heatmap, Compliance gauge, AI insights, Charts, Activity feed |
| **Risks** | CRUD, Level/Category/Status filters, Detail sheet, Risk score matrix |
| **Incidents** | Report, Assign, Status timeline, Severity levels |
| **Compliance** | ISO 27001, SOC2, GDPR control tracking, Pass/Fail/Partial status |
| **Audits** | Create audits, Track findings, Recommendations |
| **Vendors** | Risk score, AI summary, Contract renewals |
| **Settings** | Profile, Notifications, API keys |

---

## 🗄️ Database Schema

9 tables in Supabase:
- `organizations` · `profiles` · `risks` · `incidents`
- `controls` · `audits` · `audit_findings` · `vendors`
- `evidence_files` · `activities`

All tables have Row Level Security (RLS) — users only see their organization's data.

---

## 🤖 AI Features (OpenAI Placeholders)

- Risk summaries and mitigation suggestions
- Incident analysis
- Vendor security assessments
- Compliance recommendations

Configure `OPENAI_API_KEY` in `.env.local` to enable.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | TailwindCSS v4 |
| UI | Radix UI + custom components |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Icons | Lucide React |

---

## 📝 Scripts

```bash
npm run dev    # Development server (http://localhost:3000)
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```
