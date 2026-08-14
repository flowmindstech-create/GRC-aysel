# GRCell — Test Planı və Əhatə Matrisi

Bu sənəd təhvil-təslim test planının hər bəndini kod bazasındakı əhatə ilə əlaqələndirir.
Avtomatik testlər `vitest` ilə işləyir: **`npm test`** (94 test, 13 fayl).

| Simvol | Məna |
|--------|------|
| ✅ AVTO | Vitest unit/integration testi ilə əhatə olunub |
| 🔒 RLS | Supabase RLS/trigger ilə DB səviyyəsində məcbur edilir (phase45–51 SQL) |
| 🧪 MANUAL | Əl ilə / ssenari əsaslı yoxlanılır (UAT və ya canlı mühit) |
| ⛔ N/A | Bu versiyada tətbiq olunmayıb (əhatədən kənar) |

---

## 1. Funksional testlər

| Bənd | Status | Sübut |
|------|--------|-------|
| İstifadəçilərin yaradılması və giriş | ✅ AVTO + 🧪 | `permissions.test.ts` (rol/səlahiyyət); giriş axını Supabase Auth — `src/app/(auth)/login`, `register` (manual UAT) |
| İstifadəçi rolları və səlahiyyətlərinin düzgün tətbiqi | ✅ AVTO + 🔒 | `permissions.test.ts` (10 test: roleLevel, can, atLeast, super_admin); DB-də `guard_role_change`, RLS |
| Risklərin yaradılması / redaktə / silmə | ✅ AVTO + 🔒 | `risk-id.test.ts` (kod generasiyası); redaktə/silmə yalnız super_admin — UI gate + `super_admin_delete_only` RLS |
| Risk qiymətləndirilməsinin düzgün işləməsi | ✅ AVTO | `rcsa.test.ts` (17 test: inherent 5×5 matris, residual, control effectiveness, treatment matris, gap) |
| Nəzarət tədbirlərinin risklə əlaqələndirilməsi | ✅ AVTO | `rcsa.test.ts` (`aggregateControlEffectiveness`, `evaluateControlActivity`); `control-id.test.ts` |
| RCSA prosesinin icrası | ✅ AVTO | `rcsa.test.ts` + `risk-logic.test.ts` (trigger→control→residual konsistensiyası) |
| Audit tapıntılarının yaradılması və izlənməsi | 🧪 MANUAL | `audit-findings-workflow` modulu — UAT ssenarisi |
| Fəaliyyət planları / status dəyişikliyi | ✅ AVTO + 🔒 | `risk-status.test.ts` (normalizasiya, legacy map); status yalnız risk komandası — `guard_risk_approval` trigger (phase50) |
| KRI göstəricilərinin daxil edilməsi və monitorinqi | 🧪 MANUAL | `monitoring` modulu (KRI/KCI/KPI) — UAT |
| Dashboard və hesabatlar | 🧪 MANUAL | `dashboard` — vizual/UAT; hesablama qatı `perf.test.ts` ilə smoke |
| Excel idxal/ixrac | ✅ AVTO | `export.test.ts` (12 test: buildRowMatrix, buildCsv, BOM, RFC-4180 escaping, AZ hərfləri) |
| Bildiriş və xatırlatma | ✅ AVTO + 🧪 | `email.test.ts` (welcome məktub render + konfiqurasiya); in-app bildiriş — UAT |

## 2. İnteqrasiya testləri

| Bənd | Status | Sübut |
|------|--------|-------|
| Active Directory / LDAP | ⛔ N/A | Bu versiyada tətbiq olunmayıb — auth Supabase üzərindədir |
| Elektron poçt bildirişləri | ✅ AVTO | `email.test.ts` (Resend; açar yoxdursa şəbəkəsiz xəta, HTML render, XSS escaping) |
| Digər sistemlərlə məlumat mübadiləsi | 🧪 MANUAL | Jira inteqrasiyası — `Settings → Integrations`, canlı test |

## 3. Təhlükəsizlik testləri

| Bənd | Status | Sübut |
|------|--------|-------|
| Autentifikasiya və avtorizasiya | ✅ AVTO + 🔒 | `permissions.test.ts`; Supabase Auth + RLS `org_id` təcridi |
| Rollara əsaslanan giriş hüquqları | ✅ AVTO + 🔒 | `permissions.test.ts` (capability min-levels); delete/approve/manage_users = super_admin, DB triggerləri |
| Audit Trail qeydləri | 🧪 MANUAL | `db.addActivity` bütün yazılarda activity qeyd edir — `activities` cədvəli, UAT |
| İcazəsiz giriş cəhdlərinin qarşısı | ✅ AVTO + 🔒 | `subscription.test.ts` (abunə qıfılı); RLS: başqa org datası görünmür, email XSS escaping (`email.test.ts`) |

## 4. Performans testləri

| Bənd | Status | Sübut |
|------|--------|-------|
| Normal yük altında işləmə | 🧪 SKRİPT | `tests/load/k6-smoke.js` — `k6 run tests/load/k6-smoke.js` |
| Hesabatların məqbul müddətdə formalaşması | ✅ AVTO (smoke) | `perf.test.ts` (50k risk hesablaması <250ms, 100k RBAC <100ms) |
| Eyni vaxtda çoxsaylı istifadəçi | 🧪 SKRİPT | `k6 run --vus 50 --duration 2m tests/load/k6-smoke.js` (thresholds: p95<2s, xəta<1%) |

## 5. İstifadəçi Qəbul Testi (UAT)

Təşkilat nümayəndələri (İcbari Sığorta Bürosu) tərəfindən əvvəlcədən razılaşdırılmış
ssenarilər üzrə aparılır. **Hər ssenarinin biznes-məntiqi avtomatlaşdırılıb** —
`uat.test.ts` (15 test); UI axını isə `tests/e2e/smoke.spec.ts` (Playwright).

| # | Ssenari | Biznes-məntiq (AVTO) | UI axını |
|---|---------|----------------------|----------|
| 1 | Super Admin hər şeyi görür, təsdiq/silmə edir | ✅ `uat.test.ts` | 🧪 Playwright |
| 2 | Employee risk yaradır → pending, öz yaratdığını görür, redaktə görmür | ✅ `uat.test.ts` | 🧪 |
| 3 | Super Admin təsdiqləyir; employee özü təsdiqləyə bilmir | ✅ `uat.test.ts` | 🧪 |
| 4 | likelihood×impact → inherent → nəzarət → residual düz hesablanır | ✅ `uat.test.ts` | — |
| 5 | Reyestr Excel/CSV ixracı: filtrlənmiş data düz, AZ hərfləri | ✅ `uat.test.ts` | 🧪 |
| 6 | Abunə bitəndə/dayandırılanda giriş bloklanır | ✅ `uat.test.ts` | 🧪 |

**Qəbul şərti:** yalnız bütün kritik testlər uğurla tamamlandıqdan sonra sistem istismara qəbul edilir.

---

## Test infrastrukturu

- **Framework:** Vitest 4.1.10 · **İcra:** `npm test` · **Config:** `vitest.config.ts`
- **Unit/integration faylları** (`src/lib/*.test.ts`): permissions, rcsa, risk-status, risk-id, risk-logic,
  risk-categories, whistleblow-crypto, export, subscription, email, control-id, org, perf, **uat**
- **Cəmi: 14 fayl, 111 test — hamısı keçir ✅**
- **E2E / yük skriptləri** (`tests/`): `tests/e2e/smoke.spec.ts` (Playwright), `tests/load/k6-smoke.js` (k6)

### E2E və yük testinin icrası (canlı mühit, ayrıca alət)
```bash
# Playwright E2E smoke (public axınlar — auth-suz, canlı datanı dəyişmir)
npm i -D @playwright/test && npx playwright install chromium
BASE_URL=https://grcell.com npx playwright test tests/e2e/smoke.spec.ts

# k6 yük testi (k6.io ayrıca binardır)
k6 run tests/load/k6-smoke.js                          # smoke (10 vus, 30s)
k6 run --vus 50 --duration 2m tests/load/k6-smoke.js   # ağır yük
```
