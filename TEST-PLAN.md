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
| Normal yük altında işləmə | 🧪 MANUAL | k6/Playwright ilə canlı mühitdə (aşağıya bax) |
| Hesabatların məqbul müddətdə formalaşması | ✅ AVTO (smoke) | `perf.test.ts` (50k risk hesablaması <250ms, 100k RBAC <100ms) |
| Eyni vaxtda çoxsaylı istifadəçi | 🧪 MANUAL | Konkurrensiya testi — canlı (Supabase connection pool + Vercel) |

## 5. İstifadəçi Qəbul Testi (UAT)

Təşkilat nümayəndələri (İcbari Sığorta Bürosu) tərəfindən əvvəlcədən razılaşdırılmış
ssenarilər üzrə aparılır. Kritik ssenarilər:

1. Super Admin (Aysel) daxil olur → bütün reyestrləri görür, təsdiq/silmə edə bilir.
2. Adi istifadəçi (employee) risk yaradır → "Gözləmədə" düşür, öz yaratdığını görür, redaktə/silmə görmür.
3. Super Admin təsdiqləyir → risk rəsmiləşir. Adi istifadəçi özü təsdiqləyə bilmir (DB rədd edir).
4. Risk qiymətləndirməsi: likelihood×impact → inherent → nəzarətlər → residual düzgün hesablanır.
5. Reyestr Excel/PDF ixracı: filtrlənmiş data düz açılır, AZ hərfləri korrekt.
6. Abunə: müddət bitəndə/dayandırılanda giriş bloklanır ("Abunəlik bitib" ekranı).

**Qəbul şərti:** yalnız bütün kritik testlər uğurla tamamlandıqdan sonra sistem istismara qəbul edilir.

---

## Test infrastrukturu

- **Framework:** Vitest 4.1.10 · **İcra:** `npm test` · **Config:** `vitest.config.ts`
- **Avtomatik test faylları** (`src/lib/*.test.ts`): permissions, rcsa, risk-status, risk-id, risk-logic,
  risk-categories, whistleblow-crypto, export, subscription, email, control-id, org, perf
- **Cəmi: 13 fayl, 94 test — hamısı keçir ✅**

### Real yük testi (manual, tövsiyə olunan)
Canlı performans/konkurrensiya üçün ayrıca alət tələb olunur (kod bazasında deyil):

```bash
# Nümunə: k6 ilə yük testi (grcell.com-a qarşı)
k6 run --vus 50 --duration 2m load-test.js
# Nümunə: Playwright ilə E2E kritik axınlar
npx playwright test
```
