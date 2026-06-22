# RiskShield IRM — Platforma Walkthrough

**Versiya:** v2 (2026-06-22)
**Təşkilat:** Acme Corp (demo)
**Prinsip:** Tam **qayda/riyazi-məntiq əsaslı** İnteqrasiya olunmuş Risk İdarəetmə (IRM/GRC) platforması.
**Süni intellekt YOXDUR** — bütün hesablamalar (severity, residual, SLA, coverage, avtomatik insident) matris və qaydalarla aparılır. Süni intellekt yalnız platformanı qurarkən köməkçi rol oynayıb.

---

## 1. Ümumi memarlıq
- **Texnologiya:** Next.js 16 · React 19 · TypeScript · TailwindCSS v4 · Supabase (PostgreSQL + RLS) · Vercel (avtomatik deploy).
- **Təhlükəsizlik:** Hər cədvəl **Row-Level Security (RLS)** ilə təşkilata bağlıdır; rol-əsaslı giriş (admin · risk_manager · auditor · employee).
- **Vizual:** Dark-mode, minimalist, reyestr (register) əsaslı interfeys.
- **Bütün modullar bir-biri ilə əlaqəlidir** (siloları aradan qaldıran vahid data modeli): Proses ↔ Kontrol ↔ Risk ↔ Öhdəlik ↔ Siyasət ↔ İnsident.

---

## 2. Əsas modullar

### 2.1. Risk Register (Risk Reyestri)
- Departament-əsaslı Risk ID (məs. IT-2026-001), 6-statuslu pipeline.
- **RCSA metodologiyası:** likelihood × impact → inherent (ilkin) risk; kontrol effektivliyi → residual (qalıq) risk — hamısı təşkilatın Excel metodologiyasından söz-söz götürülüb.
- Triggers → Controls (bowtie), 9 təsir ölçüsü, treatment (mitigate/accept/transfer/avoid) + rol-əsaslı təsdiq.

### 2.2. Control Library (Nəzarət Kitabxanası)
- Hər kontrol: tip (preventive/detective/corrective/directive), metod (manual/automated/hybrid), tezlik, sahib, effektivlik, evidence.
- **Approval workflow:** draft → pending_review → approved. İnsidentdən yaranan yeni kontrollar "gözləmədə" düşür, risk owner təsdiqləyir.

### 2.3. Control Mapping (Nəzarət Uyğunlaşdırılması)
İki tab:
- **Mapping Matrix** — kontrol × risk/requirement kəsişmə şəbəkəsi (xanaya klikləyib R/C/D işarələnir).
- **Business Processes** — biznes prosesləri reyestri (aşağıda 2.4).

### 2.4. Business Processes (Biznes Prosesləri) — *v2-də gücləndirildi*
- Hər proses: kod (PRC-…), ad, **owner** (departament seçəndə avtomatik şöbə rəhbəri), **status** (Active/Draft/Archived), **criticality (tier)**.
- **Çoxşaxəli əlaqələr (M:N):** Controls · Risks · Obligations · Policies — reyestrdə **kod çipləri** ilə göstərilir.
- İnsident bir prosesə bağlananda yalnız o prosesin kontrolları seçilə bilir + əlaqəli risk/incident çıxır + son 3 ay üzrə xəbərdarlıq.

### 2.5. Compliance Obligation Register (Uyğunluq Reyestri — ISO 37301)
- Hər öhdəlik: kod, requirement, scope, compliance article, **regulator**, **related control**, **related policy**, **evidence**, kritiklik, məsul struktur/şəxs/rol.
- **Risk of Non-Compliance** sütunu → "Reallaşdı?" düyməsi avtomatik **aktiv risk** yaradır.
- **Regulatory Change Management** + **Interested Parties** (maraqlı tərəflər ↔ öhdəlik əlaqəsi) eyni səhifədə tablar.

### 2.6. Compliance Monitoring & Assessment — *v2-də yeni*
- Dövri yoxlama reyestri: control × obligation × **nəticə** (Compliant/Partially/Non-Compliant/Not Tested).
- **Müşahidə olunan vəziyyət**, evidence + fayl əlavəsi, findings, remediation plan.
- **Non-Compliant → avtomatik İNSİDENT** yaradılır (dublikatsız).
- **Compliant → növbəti baxış tarixi** tezlikdən avtomatik hesablanır.
- **Framework coverage %** kartları (məs. ISO 27001: 88%).
- Köhnə Control Checklist bura tab kimi birləşdi.

### 2.7. Incident Management (İnsident İdarəetməsi) — *v2-də gücləndirildi*
3 mərhələ: **Intake → Investigation → Resolution**.
- **Intake:** Reporter Struktur → **Şəxs** (asılı dropdown), **kateqoriya**, əlaqəli proses, **avtomatik severity** (likelihood×impact, kilidli), gələcək tarix bloku.
- **Investigation:** araşdırma rəhbəri + üzvləri; cari kontrol → **residual risk** (risk register məntiqi); **compliance əlaqəsi + uyğunsuzluq işarəsi**; **root cause 5 ISO seçimi** (process/human/control gap/procedure gap/third party) + **5-Why**; **Dept→ERO təyinatı**.
- **Resolution:** **CAPA** — kollektiv (mövcud kontrolu təkmilləşdir / yeni pending kontrol) + preventiv (root cause-a bağlı); ERO "əlavə qeyd" yazır.
- **SLA:** prioritetdən avtomatik müddət; status yalnız **risk owner** dəyişir; "broken compliance" zənciri (insident hansı öhdəlikləri pozur).

### 2.8. Whistleblowing (Anonim Şikayət)
- **AES-GCM şifrələmə** — şikayət məzmunu yalnız officer kodu ilə açılır (admin belə kodsuz görə bilməz).
- Gmail ingest endpoint hazırdır (app password veriləndə canlı işləyir).

### 2.9. Digər modullar
- **Risk Appetite Statement** (within/warning/breached).
- **Financial Risks** (portfel + investisiya tabları, level auto).
- **Stress Tests & Scenario Analysis** (pass/attention/fail).
- **Audits · Findings Workflow · Monitoring (KRI/KCI/KPI) · Policies · Vendors**.

---

## 3. Rollar və giriş (RBAC)
| Rol | Görür |
|-----|-------|
| **Admin / Risk Manager** | Hər şeyi (tam reyestr, statusları dəyişir, təsdiq verir) |
| **ERO / Assignee** | Yalnız ona təyin olunan resolution-u (status dəyişə/ötürə bilmir, qeyd yazır) |
| **Employee** | Yalnız özünə aid risk/incident-i; sadələşdirilmiş naviqasiya |

Bölünmə həm UI (naviqasiya) həm də server (Supabase RLS) səviyyəsində qorunur.

---

## 4. Modullararası əsas axınlar (qayda-əsaslı)
1. **Siyasət → Öhdəlik → Kontrol → Mapping** (uyğunluq zənciri).
2. **Obligation uyğunsuzluğu → avtomatik aktiv risk** (Risk Register-ə).
3. **Compliance Monitoring Non-Compliant → avtomatik incident** (Incident modulu).
4. **İnsident → cari kontrol → residual risk** + **pozulan öhdəliklər** zənciri.
5. **CAPA-da yeni kontrol → Control Library/Map-ə "gözləmədə"** → risk owner təsdiqi.
6. **Proses → əlaqəli kontrol/risk/incident + son 3 ay alert.**

---

## 5. v2 təkmilləşmənin yekunu (4 referans sənəd əsasında)
- **Business Process** tam GRC qovşağına çevrildi (status/criticality/owner + policy/risk/obligation linkləri + kod çipləri).
- **Incident** ISO-uyğun root cause + 5-Why + reporter person + category + compliance flag + **ERO routing**.
- **Compliance Monitoring** modulu (auto-incident + coverage % + observed state + evidence).
- **İzlənilənlik** (traceability) tam: insidentdən compliance pozuntusuna qədər zəncir görünür.

> Nəticə: RiskShield artıq sadəcə qeydiyyat jurnalı deyil — bir-biri ilə "danışan", qayda-əsaslı, izlənilə bilən canlı GRC orqanizmidir.
