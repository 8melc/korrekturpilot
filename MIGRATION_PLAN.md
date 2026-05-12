# KorrekturPilot — Migrationsplan: gannaca → Markmate

**Stand:** 2026-05-12
**Quelle:** gannaca GmbH & Co. KG (+ private Accounts von Mel)
**Ziel:** Markmate GmbH (i.G.) als alleinige operative + rechtliche Eigentümerin
**Empfänger nach Cut-Over:** Moritz Knapp (nicht-technisch)
**Mel-Beteiligung:** bis einschließlich Cut-Over-Tag, danach komplett raus

---

## 0. Lesart der Tabellen

Jede Tabellenzeile ist mit einem Tag versehen:

| Tag | Bedeutung |
|-----|-----------|
| **[M]** | Mel-Aufwand SOLO (mit KI / Claude Code) |
| **[CW]** | Co-Working mit Moritz LIVE (Account-Erstellung, 2FA, KYC-Bestätigung) |
| **[MM]** | Markmate-Aufgabe OHNE Mel (KYC einreichen, Bankkonto, Domain-Auth-Code annehmen) |
| **[W]** | Reine Wartezeit (KYC-Prüfung, DNS-Propagation, Registrar-Transfer) — keine Arbeitszeit |

Zeitangaben sind realistische Bandbreiten ohne Puffer-Padding.

---

## 1. Technische Inventur (Ist-Zustand)

Stack-Realität dieses Repos (verifiziert):

| Dienst | Verwendung | Env-Variablen (heute) | Webhook-Endpoint(s) |
|--------|------------|------------------------|---------------------|
| **GitHub** | Repo-Hosting, CI über Vercel-Integration | — | — |
| **Supabase** | Auth + Postgres (10 Migrationen) + Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth-Callbacks |
| **Vercel** | Next.js 16 Hosting, ENV-Verwaltung | (alle anderen ENV laufen hier) | — |
| **Stripe** | Checkout, Subscriptions, Webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ID_PACKAGE_25`, `NEXT_PUBLIC_STRIPE_PRICE_ID_ONE_TIME` | `/api/webhook`, `/api/webhooks/stripe`, `/api/stripe/webhook` |
| **OpenAI** | KI-Analyse, Bewertung | `OPENAI_API_KEY` | — |
| **Google Gemini** | PDF-Extraktion (handgeschrieben) | `GOOGLE_AI_KEY` | — |
| **Domain `korrekturpilot.de`** | Registrar bei gannaca (vermutlich INWX/Strato/etc.) | DNS-Zone | — |
| **Google Workspace** | E-Mails (`@korrekturpilot.de` an gannaca) | SMTP / Nodemailer (siehe Support-API) | — |
| **SMTP für Support-Mails** | `nodemailer` (siehe `app/api/support`) | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | — |

**Achtung — drei Webhook-Pfade aktiv im Code.** Im Cut-Over müssen alle drei im neuen Stripe-Account konfiguriert werden, sonst gehen Events verloren.

---

## 2. Migrationsliste — Vollständig, gegliedert nach A / B / C

### A) Mel SOLO (mit KI-Unterstützung)

Reine Code-/Dokumenten-/Daten-Arbeit. Kein Account-Login bei Markmate nötig.

| # | Aufgabe | Zeit (Mel) | Abhängigkeit |
|---|---------|-----------|--------------|
| A1 | Repo-Inventur: alle Stellen mit „gannaca", privater Mel-Mail, alten Adressen finden (grep über Code, Impressum, README, E-Mail-Templates, SMTP `from`, Mailer-Signaturen) | 1–2 h | — |
| A2 | ENV-Variablen-Inventar: alle aktuell gesetzten Werte aus Vercel auslesen, in verschlüsseltem Vault (1Password / Bitwarden Markmate) ablegen, dokumentieren welche neu gesetzt werden müssen | 0.5–1 h | — |
| A3 | Stripe-Bestandsdaten exportieren: Customers, Subscriptions, Invoices, Products, Prices, Coupons, Payment-Methods, Tax-IDs als CSV ziehen (Stripe Dashboard → Reports) | 1 h | — |
| A4 | Stripe-Webhook-Endpoint-Liste exportieren (alle drei aktiven Pfade + Events + Signing-Secrets) | 0.25 h | A3 |
| A5 | Supabase: `pg_dump` der Schemas `public`, `auth`, `storage` + RLS-Policies + Storage-Bucket-Listing + Storage-Objekte (rclone/Supabase-CLI) | 1–2 h | — |
| A6 | Supabase Auth-User-Export: über Admin-API mit Service-Role-Key, inkl. `encrypted_password` (bcrypt-Hash) — nur damit funktioniert späterer Import ohne Passwort-Reset | 0.5 h | A5 |
| A7 | DNS-Zone von `korrekturpilot.de` als Zonefile exportieren (alle Records: A, AAAA, CNAME, MX, TXT, DKIM, SPF, DMARC) | 0.5 h | — |
| A8 | Google-Workspace-Inventur: aktive Postfächer, Aliase, Weiterleitungen, Groups, Drive-Inhalte (im Migration-Manifest dokumentieren) | 0.5 h | — |
| A9 | Code-Änderungen: alle gannaca-Strings ersetzen (Impressum, AGB, Datenschutz, E-Mail-Footer, SMTP-`from`, Support-Mail-Adresse, `package.json` `author` falls gesetzt) — als PR auf neuem Branch | 1–2 h | A1 |
| A10 | Migrations-Skripte vorbereiten: `import-auth-users.ts`, `copy-storage-buckets.ts`, `stripe-customer-migration-checklist.md` | 1–2 h | A5, A6 |
| A11 | Neuer Supabase-Projekt-Aufbau (im Markmate-Org, **siehe B5 für Org-Erstellung**): Schema aus pg_dump einspielen, RLS-Policies, Storage-Buckets neu anlegen, Auth-Settings (SMTP, Templates, Redirect-URLs) replizieren | 1.5–2.5 h | B5, A5 |
| A12 | Storage-Daten kopieren (alte Bucket → neue Bucket, idempotent, prüfen auf vollständige Kopie) | 0.5–2 h (datenmengenabhängig) | A11 |
| A13 | Auth-User-Import in neues Supabase (mit `encrypted_password` → kein Passwort-Reset nötig, wenn Import erfolgreich) | 0.5–1 h | A6, A11 |
| A14 | Vercel-Projekt im Markmate-Team neu anlegen, Git-Connection auf Markmate-GitHub-Repo, alle ENV-Variablen neu setzen (Production + Preview), Build prüfen | 1–1.5 h | B4, B6 |
| A15 | Preview-Deploy auf Wegwerf-Subdomain (`korrekturpilot-markmate.vercel.app`) testen: Login mit migriertem User, Upload, Korrektur-Flow, Stripe-Test-Checkout, Webhook-Receipt, Support-Mail | 1–2 h | A14, B9 |
| A16 | Cut-Over-Runbook schreiben (siehe §6) | 0.5 h | — |
| A17 | Cut-Over-Tag operativ ausführen (siehe §6) | 2–4 h | alles vorher |
| A18 | Post-Cut-Over-Verifikation: Smoke-Tests, 24h-Monitoring, Übergabe-Doku an Moritz | 1–2 h | A17 |
| **Summe Mel-Solo (ohne Cut-Over-Tag)** | | **~10–18 h** | |
| **+ Cut-Over-Tag** | | **2–4 h** | |

---

### B) CO-WORKING — Mel + Moritz LIVE (für 2FA, Account-Erstellung, KYC-Bestätigung)

Diese Schritte erfordern Moritz' Telefon (2FA-SMS/Authenticator), seine E-Mail-Bestätigung oder seine ID. Live-Termin nötig (Bildschirmteilen + Telefon).

| # | Aufgabe | Zeit (live) | Reine Wartezeit | Vor-Abhängigkeit |
|---|---------|-------------|------------------|-------------------|
| B1 | **Vorab-Voraussetzung**: Markmate GmbH (i.G.) Gründungsurkunde + HR-Auszug oder Bestätigung GbR-Anteil; Geschäfts-E-Mail für Moritz (z. B. moritz@markmate.de auf Übergangs-Workspace) | — | — | (Markmate vorab, siehe C1) |
| B2 | **Markmate Google Workspace** erstellen (auf NEUER Domain `markmate.de`, NICHT auf `korrekturpilot.de` — sonst Lock-Konflikt beim Domain-Transfer). Admin-User = Moritz. Mel als Super-Admin temporär dazu für Migration | 0.5–1 h | DNS-Propagation 0–24 h | — |
| B3 | E-Mail-Postfach `team@markmate.de` (oder ähnlich) aktivieren — wird für alle nachfolgenden Account-Registrierungen verwendet (KEIN privates Mel-Postfach!) | 0.25 h | — | B2 |
| B4 | **Markmate GitHub Organization** anlegen (Plan: Team oder Free). Moritz = Owner. Mel = temporärer Admin | 0.5 h | — | B3 |
| B5 | **Markmate Supabase Organization** anlegen, Billing auf Markmate-Karte (siehe C4). Moritz = Owner | 0.5 h | — | B3, C4 |
| B6 | **Markmate Vercel Team** anlegen (Pro-Plan), Billing auf Markmate-Karte. Moritz = Owner | 0.5 h | — | B3, C4 |
| B7 | **Markmate OpenAI Organization** anlegen (über `platform.openai.com` mit `team@markmate.de`). Billing-Karte hinterlegen. **API-Limit-Tier startet niedrig** (Tier 1) → ggf. höher beantragen | 0.5 h | Tier-Erhöhung: 0–7 Tage (W) | B3, C4 |
| B8 | **Markmate Google AI / Gemini** Account (Google Cloud Project unter Markmate-Workspace, Vertex AI / AI Studio aktivieren, Billing hinterlegen) | 0.5–1 h | — | B2, C4 |
| B9 | **Markmate Stripe Account** anlegen, KYC-Daten eingeben (Geschäftsführer-ID, Firmensitz, USt-ID, Bankverbindung) — **KYC-Prüfung läuft asynchron** | 0.5–1 h live | KYC: 1–3 Werktage (W) | B3, C2, C3 |
| B10 | **Markmate Domain-Registrar Account** anlegen (z. B. INWX, Hetzner, Namecheap — egal welcher, Hauptsache nicht gannaca). Karte hinterlegen | 0.5 h | — | B3, C4 |
| B11 | **GitHub Repo-Transfer** von Mel-Privat → Markmate-Org initiieren (Mel klickt „Transfer", Moritz bestätigt in der Org). Vercel-Git-Integration muss danach neu autorisiert werden | 0.5 h | — | A1–A9 fertig, B4 |
| B12 | **Vercel-Domain hinzufügen** (Custom Domain `korrekturpilot.de` im neuen Vercel-Projekt vorbereiten — DNS-Switch passiert am Cut-Over-Tag, siehe §6) | 0.25 h | — | A14 |
| B13 | **Stripe Webhook-Endpoints** im neuen Stripe-Konto anlegen (alle drei Pfade: `/api/webhook`, `/api/webhooks/stripe`, `/api/stripe/webhook`), Signing-Secrets in Vercel-ENV des neuen Projekts setzen | 0.5 h | — | A14, B9 (Stripe aktiviert) |
| B14 | **Stripe Test-Mode-End-to-End**: echter Test-Checkout im Preview-Deploy, Webhook-Empfang verifizieren, DB-Eintrag prüfen, Credits-Gutschrift prüfen | 0.5–1 h | — | B13, A15 |
| B15 | **2FA für alle neuen Markmate-Accounts** durchziehen (GitHub-Org, Vercel, Supabase, Stripe, OpenAI, Google, Registrar): Authenticator-App **auf Moritz' Gerät**, Recovery-Codes in Markmate-Vault | 1–1.5 h kumuliert | — | B4–B10 |
| B16 | **Domain-Transfer einleiten**: bei gannaca (alter Registrar) Auth-Code anfordern → bei Markmate-Registrar (neu) Transfer-In starten → Markmate bestätigt im Postfach des neuen Registrars (= [MM]-Schritt C6) | 0.5 h | Transfer-Wartezeit: 5–7 Tage (W) | B10 |
| B17 | **Google Workspace Domain-Hinzufügung** (sekundär): `korrekturpilot.de` als Aliasdomain in den Markmate-Workspace eintragen — geht aber erst nach Domain-Transfer (B16 abgeschlossen) oder mit DNS-Verifikation während gannaca noch Registrar ist | 0.5 h | Verifikation 0–48 h (W) | B16 abgeschlossen |
| B18 | **Cut-Over Live-Session** (DNS-Switch, ENV-Switch, Webhook-Aktivierung) — Moritz dabei, falls 2FA bei einem Dienst greift | 1–2 h | — | alles vorher |
| **Summe Co-Working (live)** | | **~7–11 h** | + KYC-Warte 1–3 Tage, + Transfer-Warte 5–7 Tage, + DNS-Warte ≤48 h | |

---

### C) MARKMATE eigenständig — ohne Mel

Diese Aufgaben kann nur Markmate selbst erledigen (rechtlich, finanziell, identitätsgebunden). Mel hat nichts damit zu tun — diese Zeit ist **nicht** Mel-Aufwand.

| # | Aufgabe | Zeit Markmate | Reine Wartezeit | Spätester Zeitpunkt |
|---|---------|---------------|------------------|----------------------|
| C1 | GmbH-Gründung formal abschließen: Notarvertrag, HR-Eintragung, Stammkapital-Einzahlung — falls noch i.G., muss für KYC-Prozesse zumindest „in Gründung mit Notarurkunde" vorliegen | externer Prozess | 1–6 Wochen (W), je nach Notar/HR | **vor B9 (Stripe-KYC)** |
| C2 | **Geschäftsbankkonto** für Markmate eröffnen (Sparkasse, Postbank, Qonto, Finom) — IBAN + Kontoauszug für Stripe-KYC nötig | 0.5–1 h Antrag | 1–14 Tage (W) | **vor B9** |
| C3 | **Geschäfts-Kreditkarte** beantragen (oder Debit-Karte vom Geschäftskonto) — für alle SaaS-Abos | 0.25 h | 0–14 Tage (W) | **vor B5–B10** |
| C4 | Karte / SEPA-Mandate bei jedem Dienst eintragen (Supabase, Vercel, OpenAI, Google Cloud, Stripe-Auszahlungs-IBAN, Registrar) | 0.5 h kumuliert | — | bei B-Schritten parallel |
| C5 | **Stripe KYC einreichen**: Geschäftsführer-Ausweis (Foto), HR-Auszug, USt-ID, Adresse | 0.5–1 h | Stripe-Prüfung 1–3 Werktage (W), bei Rückfragen länger | **direkt nach B9** |
| C6 | **Domain-Transfer-Bestätigung** im neuen Registrar-Postfach annehmen (Auth-Code wird in B16 von Mel/Moritz eingereicht, Bestätigungs-Mail geht aber an Markmate-Registrar-Postfach) | 0.1 h | 5–7 Tage Registrar-Sperre (W) | **nach B16** |
| C7 | **Impressum, AGB, Datenschutz, Cookie-Banner** auf Markmate-Daten umschreiben (Anwalt-Review!) — fließt in A9 ein (Mel baut Texte ein, aber Markmate liefert/freigibt) | 1–3 h juristischer Aufwand | Anwalt: 1–5 Tage (W) | **vor A9-Merge** |
| C8 | **Auftragsverarbeitungs-Verträge (AVV)** neu mit Supabase, Vercel, OpenAI, Google, Stripe abschließen (im Dashboard akzeptieren, manche per E-Mail) | 1 h | — | nach B5–B10 |
| C9 | **Umsatzsteuer-ID / EU-OSS** beantragen (falls über DE hinaus verkauft wird) | 0.5 h Antrag | 1–4 Wochen (W) | wenn relevant, vor Live-Switch nicht zwingend |
| C10 | **Übernahme-Vereinbarung Mel ↔ Markmate** (Software, Daten, Kundenstamm, ggf. Kaufpreis / Gesellschafterbeschluss) | extern, 1–4 h | — | **vor Cut-Over** |
| **Summe Markmate (ohne Mel)** | | **~5–11 h Arbeit** | + 1–6 Wochen Wartezeit (parallel zu A/B) | |

---

## 3. Kritische Reihenfolge (was MUSS vor was?)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 0 — Vorab (Markmate baut Basis)                              │
│   C1 GmbH-Status   →   C2 Bankkonto   →   C3 Karte                 │
│                                          │                          │
│                            ─────────────┴─────────────              │
│                            ↓ erst dann sind B-Schritte machbar      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1 — Account-Setup (Co-Working live)                          │
│                                                                     │
│   B2 Google Workspace ─→ B3 team@markmate.de                       │
│        ↓                                                            │
│   ┌────────────────────┴───────────────────────────────────┐       │
│   ↓ (parallel)                                              ↓       │
│   B4 GitHub-Org   B5 Supabase   B6 Vercel   B10 Registrar          │
│   B7 OpenAI       B8 Gemini                                         │
│        ↓                                                            │
│   B9 Stripe (KYC)  →  WARTE 1–3 Tage (C5 Markmate-Side)            │
│        ↓                                                            │
│   B15 2FA für ALLE neu angelegten Accounts                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2 — Code & Daten (Mel solo)                                  │
│                                                                     │
│   A1–A8 Inventur + Exporte (parallel zu Phase 1 möglich)           │
│        ↓                                                            │
│   A9 Code-PR mit Markmate-Strings                                  │
│   A10 Migrations-Skripte                                            │
│        ↓                                                            │
│   A11 Neues Supabase befüllt   (NACH B5)                           │
│   A12 Storage kopiert           (NACH A11)                          │
│   A13 Auth-User importiert      (NACH A11)                          │
│        ↓                                                            │
│   A14 Vercel-Projekt + ENV     (NACH B6, B11)                      │
│   B13 Webhook-Endpoints angelegt                                   │
│        ↓                                                            │
│   A15 + B14 Preview-Smoketests (NACH A14, B13)                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3 — Domain (langsam, parallel zu Phase 2)                    │
│                                                                     │
│   B16 Domain-Transfer initiieren                                   │
│        ↓                                                            │
│   WARTE 5–7 Tage (C6 Markmate-Side)                                │
│        ↓                                                            │
│   B17 Google Workspace Aliasdomain hinzufügen                      │
│        ↓                                                            │
│   DNS-Records bei neuem Registrar replizieren (aus A7-Export)      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4 — Cut-Over (1 Tag, Reihenfolge SIEHE §6)                   │
│                                                                     │
│   ALLE Phasen 0–3 abgeschlossen                                    │
│        ↓                                                            │
│   A17 / B18 Live-Switch                                            │
│        ↓                                                            │
│   A18 Verifikation + Übergabe                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Harte Sequenz-Gates** (verletzbar = Schaden):

| Gate | Begründung |
|------|------------|
| C2 (Bankkonto) **vor** B9 (Stripe-Account) | Stripe braucht echte IBAN für Auszahlungs-Setup |
| C5 (Stripe-KYC genehmigt) **vor** Cut-Over | sonst keine Live-Zahlungen möglich |
| B2 (Google Workspace auf markmate.de) **vor** B7 (OpenAI) | OpenAI braucht E-Mail; private oder gannaca-Mail wäre fatal |
| A6 (Auth-User-Export mit `encrypted_password`) **vor** A13 | sonst Passwort-Reset für 100% der User nötig |
| B13 (Webhooks im neuen Stripe) **vor** Cut-Over-DNS-Switch | sonst gehen Zahlungs-Events verloren |
| C7 (Impressum/AGB Markmate) **vor** Live-Switch | Wettbewerbsrecht / DSGVO-Risiko |

---

## 4. Daten-Migrations-Plan (Supabase)

### 4.1 Was wird 1:1 kopiert (verlustfrei)

| Datenkategorie | Methode | Verlust? |
|----------------|---------|----------|
| Schema (`public.*` Tabellen, Indizes, Constraints) | `pg_dump --schema-only` + `psql` | nein |
| RLS-Policies + DB-Functions + Triggers | `pg_dump --schema-only` (sind Teil des Schemas) | nein |
| Stripe-Tabellen (`001_create_stripe_tables.sql`) | als Schema | Inhalte siehe §5 |
| `corrections` Tabelle (Daten) | `pg_dump --data-only --table=corrections` | nein |
| `users` Tabelle inkl. Credits (`004_create_users_table_with_credits.sql`, `007`, `008`) | `pg_dump --data-only` | nein |
| `support_requests` (`010`) | `pg_dump --data-only` | nein |
| Storage-Buckets (Objekte) | Supabase Storage API / `rclone` via S3-kompatible Endpoints, bucketweise | nein, aber: **neue Storage-URLs** in neuem Projekt → in DB stehende absolute URLs müssen umgeschrieben werden (falls vorhanden) |
| Storage-Policies | aus `006_create_storage_policies.sql` Migration neu ausführen | nein |

### 4.2 Auth-User — kritischster Teil

**Drei Optionen, in Reihenfolge der Bevorzugung:**

| Option | Methode | Aufwand | User-Erlebnis |
|--------|---------|---------|---------------|
| **A (bevorzugt)** | Auth-User via Admin-API exportieren (inkl. `id`, `email`, `encrypted_password`, `email_confirmed_at`, `raw_user_meta_data`, `created_at`) → in neues Projekt mit `auth.admin.createUser()` + `password_hash` Parameter importieren | 0.5–1 h Skript + 0.5 h Verifikation | **Kein Passwort-Reset**, User logged sich nahtlos ein |
| **B** | Auth-User exportieren ohne Passwort → User per Magic-Link / Passwort-Reset-Mail einladen | 0.5 h Skript + Massen-Mail | User muss neu Passwort setzen — Akzeptanz-Risiko, Support-Last |
| **C** | Auth-User über Supabase „Project Transfer / Restore from backup" (falls Supabase das unterstützt — derzeit nur Project-Pause-Restore innerhalb derselben Org möglich) | 0 h, falls supportet | wäre verlustfrei |

**Empfehlung:** Option A. `encrypted_password` ist bcrypt — exportierbar via Service-Role-Key über `auth.users` Tabelle direkt (Service-Role-Key hat Lesezugriff). Import via [Supabase Auth Admin API `createUser` mit `password_hash`](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

**Wenn Option A scheitert**, Fallback auf B: vorbereiteter Massen-Versand „Bitte einmal Passwort zurücksetzen — Sicherheitsupdate, Zugang bleibt".

### 4.3 Was verloren geht (akzeptierter Verlust)

| Verlust | Warum | Mitigation |
|---------|-------|------------|
| **Aktive Auth-Sessions / JWT-Tokens** | werden bei Project-Switch ungültig (neue JWT-Secrets) | User muss einmal neu einloggen — kommunizieren |
| **Stripe-Customer-IDs** in `users.stripe_customer_id` | neue Stripe-Org hat neue Customer-IDs | siehe §5 |
| **Supabase-Realtime-Verbindungen** (falls genutzt) | brechen einmalig ab | Frontend handled das eh |
| **Logs / Audit-Trails in alter Supabase** | bleiben bei gannaca-Org | für Compliance: pg_dump archivieren, 10 Jahre aufbewahren |

### 4.4 User-Kommunikation

Eine Nachricht pro User, zeitlich VOR Cut-Over:
> „Wir migrieren KorrekturPilot in eine neue Betreibergesellschaft (Markmate GmbH). Am [Datum] zwischen [Uhrzeit] kann es zu 15 Minuten Downtime kommen. Dein Account, deine Klausuren und dein Credits-Stand bleiben unverändert. Du musst dich nach dem Update einmal neu einloggen — dein Passwort bleibt gleich. Bei Problemen: support@markmate.de."

(Falls Fallback B greift, Text anpassen: „…musst einmal ein neues Passwort setzen — Link folgt".)

---

## 5. Stripe-Migration (separat, weil unübertragbar)

**Harte Realität:** Stripe-Accounts sind nicht übertragbar. Customer-IDs, Subscription-IDs, Payment-Method-Tokens existieren nur im jeweiligen Account. Bestandskunden mit aktiver Subscription können nicht automatisch in den Markmate-Account „umgezogen" werden.

### 5.1 Drei Optionen, Trade-Offs

| Option | Was passiert | Vorteil | Nachteil | Empfohlen für |
|--------|--------------|---------|----------|----------------|
| **S1 — Stripe-Support-Migration** (Data Migration) | Stripe-Support kopiert Customers + Subscriptions + Payment-Method-Tokens (PCI-Daten) von gannaca-Account → Markmate-Account, **wenn beide Accounts ihn anfragen und PCI-Compliance bestätigen** | Verlustfrei: Subscriptions laufen weiter, gleiche Zahlungsmittel | Wartezeit 2–6 Wochen, nicht garantiert, beide Accounts müssen kooperieren, asynchrone Karten-Updater erforderlich, manche Banken kündigen Mandate bei Account-Wechsel | Wenn signifikanter Subscription-Bestand existiert |
| **S2 — Hard Switch + Re-Subscription** | Neuer Stripe-Account live ab Cut-Over, alte Subscriptions bei gannaca werden gekündigt, Bestandskunden bekommen Einladungs-Mail neu zu zeichnen (ggf. mit Rabatt-Coupon) | Sauber, schnell, klare juristische Trennung | Churn-Risiko (Kunden zeichnen nicht neu), Operations-Aufwand für Coupons | Wenn Bestand klein oder mehrheitlich Einmal-Käufer (`PACKAGE_25`, `ONE_TIME`) |
| **S3 — Parallel-Betrieb (Übergang)** | Alte Subscriptions laufen bis Ende der Periode bei gannaca aus, neue Subscriptions/Käufe ab Cut-Over im Markmate-Account | Kein User-Erlebnis-Bruch | Doppelte Buchführung 1–12 Monate, Steuer-Komplexität (zwei Konten), zwei Stripe-Webhooks im Code | Wenn rechtlich okay, gannaca als „Auslaufmodell" für maximal 12 Monate weiterzuführen |

### 5.2 Welche Option für KorrekturPilot?

Annahme aus dem Code: Es gibt `PACKAGE_25` (25er-Credit-Paket, vermutlich Einmal-Kauf) und `ONE_TIME` (Einzelkorrektur). **Keine Subscriptions im strengen Sinne sichtbar** — beides sind Einmalzahlungen, die Credits gutschreiben.

→ **Empfehlung: S2 (Hard Switch).** Da keine wiederkehrenden Subscriptions im Stripe-Sinne aktiv sind, sondern Einmal-Käufe für Credits, gibt es nichts zu „verlängern". Bestandskunden behalten ihre Credits (die liegen in Supabase, nicht in Stripe). Neue Käufe ab Cut-Over laufen einfach über den neuen Account.

**Falls doch echte Recurring-Subscriptions existieren** (bitte vorab Stripe-Dashboard prüfen: `Customers` → `Active subscriptions` Filter): dann S1 als Plan A, S3 als Fallback wenn Stripe-Support ablehnt.

### 5.3 Konkrete Schritte (für S2)

| # | Schritt | Wer |
|---|---------|-----|
| 5.S2.1 | Im alten Stripe-Konto: alle Produkte + Preise inkl. IDs exportieren | [M] |
| 5.S2.2 | Im neuen Stripe-Konto: identische Produkte + Preise neu anlegen (mit Stripe-CLI oder manuell) → **NEUE Price-IDs** | [CW] |
| 5.S2.3 | Vercel-ENV: `NEXT_PUBLIC_STRIPE_PRICE_ID_PACKAGE_25` + `NEXT_PUBLIC_STRIPE_PRICE_ID_ONE_TIME` auf neue Werte setzen | [M] |
| 5.S2.4 | `STRIPE_SECRET_KEY` (neu) + `STRIPE_WEBHOOK_SECRET` (neu) in Vercel setzen | [M] |
| 5.S2.5 | Alle drei Webhook-Endpoints im neuen Stripe-Dashboard registrieren | [CW] B13 |
| 5.S2.6 | Im alten Stripe: nach Cut-Over alle aktiven Subscriptions (falls vorhanden) auf `cancel_at_period_end=true` setzen | [M] post-cut |
| 5.S2.7 | Idempotenz: Webhook-Handler im Code prüfen — `event.id` als Idempotency-Key? Falls nein, kurze Phase aufpassen, dass keine Doppel-Credits gebucht werden | [M] (Code-Review) |
| 5.S2.8 | Stripe-Tax-Setup (USt) im neuen Konto neu konfigurieren | [MM] |

### 5.4 Wichtige Gotchas

- **Idempotency-Keys** sind pro Account! Wenn der Code `event.id` als Schlüssel speichert, kollidieren alte und neue Events nicht — aber wenn `request.idempotency-key` clientseitig generiert wird, neu prüfen.
- **Webhook-Signing-Secrets** sind pro Endpoint, nicht pro Account. Für drei Pfade → drei neue Secrets.
- **Stripe Customer Portal** muss im neuen Konto neu konfiguriert werden (Branding, Cancellation-Settings).
- **Bank-Auszahlungs-IBAN** im neuen Stripe-Konto = Markmate-Konto (nie gannaca!).

---

## 6. Cut-Over-Plan (Migrationstag)

**Voraussetzung:** Alle Phasen 0–3 abgeschlossen, Preview-Smoketests grün, Stripe-KYC genehmigt, Domain-Transfer abgeschlossen.

**Dauer:** 2–4 h für Mel, Moritz ≥ 1 h dabei verfügbar.

**Empfohlenes Zeitfenster:** Sonntag früh 06:00–10:00 (niedrige Last, keine Lehrer arbeiten).

### 6.1 T-7 Tage (vorbereitend)

| # | Aktion | Wer |
|---|--------|-----|
| CO-1 | Banner / Email an User: „Am [Datum] 06:00–10:00 ggf. kurze Downtime. Bitte einmal nach dem Update neu einloggen." | [M] |
| CO-2 | DNS-TTL aller relevanten Records senken auf 300s (5 Min) — sonst dauert Propagation länger | [M] (am alten Registrar, vor Transfer) |
| CO-3 | Alle ENV-Variablen im neuen Vercel-Projekt final verifizieren | [M] |
| CO-4 | Letzten `pg_dump` und Storage-Sync 1 Tag vor Cut-Over laufen lassen (Delta beim eigentlichen Cut-Over kleiner) | [M] |

### 6.2 T-0 (Cut-Over-Tag) — Reihenfolge

Der Punkt ohne Wiederkehr liegt bei **Schritt 9** (DNS-Switch). Davor: voll rückrollbar.

| # | Aktion | Dauer | Wer | Rollback möglich? |
|---|--------|-------|-----|--------------------|
| 1 | **T-30min: Maintenance-Banner** aktivieren im laufenden Live-System („Update läuft, kurze Auszeit") | 5 min | [M] | ja |
| 2 | Stripe-Webhooks im **alten** Konto auf „disabled" stellen (verhindert weitere Doppel-Events) | 5 min | [M] | ja, wieder enablen |
| 3 | Final-Delta-`pg_dump` (nur Tabellen mit `updated_at > letzter_dump`) + Storage-Sync der letzten 24h | 15–30 min | [M] | ja |
| 4 | Delta in neues Supabase einspielen (idempotent: `INSERT … ON CONFLICT UPDATE`) | 10 min | [M] | ja (alte DB intakt) |
| 5 | Auth-User-Delta nachziehen (neue Registrierungen seit A13) | 10 min | [M] | ja |
| 6 | Verifikations-Skript: zähle Rows pro Tabelle alt vs. neu, vergleiche Storage-Object-Counts | 10 min | [M] | n/a |
| 7 | **Smoke-Test auf Preview-Subdomain** (nicht Prod!): Login mit migriertem Test-User, Upload, Stripe-Test-Checkout | 15 min | [M] | ja |
| 8 | Vercel: Custom Domain `korrekturpilot.de` im neuen Projekt auf „Production" setzen, Vercel zeigt benötigte DNS-Werte | 5 min | [M] | ja, Domain noch nicht aktiv |
| 9 | 🚨 **POINT OF NO RETURN: DNS-Switch.** Am Markmate-Registrar (B10): A-Record / CNAME auf neue Vercel-Adresse umstellen. Mit TTL 300s | 5 min | [M] / [CW] falls 2FA bei Registrar greift | nur via DNS-Rollback (5–60 min) |
| 10 | DNS-Propagation abwarten (`dig korrekturpilot.de @8.8.8.8` und `@1.1.1.1` prüfen, mehrere Resolver) | 10–60 min (W) | [M] beobachtet | — |
| 11 | Vercel-Domain-Status auf „Ready" verifizieren (SSL-Cert auto-issued via Let's Encrypt) | 5 min | [M] | — |
| 12 | Stripe-Webhooks im **neuen** Konto auf „enabled" stellen | 5 min | [M] | ja |
| 13 | Stripe-Test: 1 € Live-Test-Checkout mit echter Karte (Markmate-Karte oder Moritz' Karte), Webhook-Receipt prüfen, Credits-Gutschrift prüfen, **Refund danach** | 15 min | [M] + [CW] | n/a |
| 14 | Old Vercel Project: auf „archived" / Deployment „pause" — aber Projekt NICHT löschen (Rollback-Anker) | 5 min | [M] | jederzeit wieder aktivieren |
| 15 | Maintenance-Banner entfernen, „Wir sind zurück"-Mail an aktive User | 5 min | [M] | ja |
| 16 | **24h-Monitoring**: Vercel-Logs, Supabase-Logs, Stripe-Webhook-Dashboard, OpenAI/Gemini-Usage | passiv | [M] | — |
| **Cut-Over-Dauer netto** | | **~2.5–4 h** | | |

### 6.3 Rollback-Plan (falls Schritt 9–13 schiefläuft)

Sofortige Aktion, in Reihenfolge:

1. **DNS-Switch zurück** auf gannaca-Vercel (TTL 300s = max. 5 Min Propagation): direkter Schaden gestoppt.
2. Stripe-Webhooks im neuen Konto: disable. Im alten: re-enable.
3. Vercel: altes Projekt wieder als „Production".
4. Maintenance-Banner aktiv lassen bis Root-Cause klar.
5. Post-mortem, neuer Cut-Over-Termin 1 Woche später.

**Wichtig:** Solange die alte Supabase, alte Stripe-Konfig und altes Vercel-Projekt **nicht** gelöscht sind, ist Rollback < 30 Min möglich. Daher: alte Systeme **mindestens 30 Tage** parallel halten (paused, nicht deleted).

---

## 7. Risiko-Liste

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|---------------------|--------|------------|
| R1 | **Webhook-Events während Cut-Over verloren** (Käufe zwischen „alt disabled" und „neu enabled") | hoch in der 30-min-Lücke | mittel (User-zahlt-aber-keine-Credits) | Maintenance-Banner blockt Checkout-Klicks; Stripe-Dashboard auf Webhook-Failures monitoren; manuelle Nacharbeit für Fenster-Käufe |
| R2 | **OpenAI Rate-Limit** auf neuem Konto (Tier 1 = 500 RPM, 90.000 TPM bei GPT-4.x) | hoch | hoch (App bricht ein bei Lastspitze) | Tier-Erhöhung 7 Tage vorher beantragen, $50 Prepaid sofort einzahlen → Tier 2; Fallback-Logik im Code (Gemini als Fallback) |
| R3 | **DNS-Propagation > 60 Min** bei alten ISPs / Corporate Caches | mittel | mittel | TTL 300s eine Woche vorher gesetzt; Status-Page Hinweis; manuelle `/etc/hosts`-Anleitung für betroffene User |
| R4 | **Auth-Password-Hash-Import scheitert** (bcrypt-Version-Mismatch) | mittel | hoch (alle User müssen Passwort resetten) | Fallback B (Passwort-Reset-Massen-Mail) vorbereitet; mit 5 Test-Usern auf Preview-Projekt vorab verifizieren |
| R5 | **Stripe-KYC dauert > 5 Werktage** wegen Rückfragen | mittel | hoch (Cut-Over verzögert) | KYC 14 Tage vor geplantem Cut-Over einreichen; Dokumente vorbereiten: HR-Auszug, Geschäftsführer-Ausweis (beidseitig), Bank-Statement, USt-Bescheid |
| R6 | **Domain-Transfer wird vom alten Registrar verzögert** (Email-Bestätigung übersehen, AuthCode falsch) | mittel | hoch (Cut-Over verzögert) | Domain-Transfer 14 Tage vor Cut-Over starten; AuthCode-Anforderung bei gannaca-Registrar dokumentieren |
| R7 | **Stripe-Idempotenz-Kollision** zwischen alten/neuen Events | niedrig | mittel | Webhook-Handler prüft `event.account` + `event.id`; alte Events mit alter Account-ID werden abgewiesen |
| R8 | **Storage-Bucket-URLs hartkodiert in Datenbank-Rows** (z. B. PDF-Links zu alten Supabase-URLs) | mittel | mittel (alte Korrekturen nicht mehr abrufbar) | Vor A12: grep in DB nach alter Supabase-URL; nach Migration: UPDATE-Statement Tausch alte→neue URL |
| R9 | **Google Workspace MX-Records am Cut-Over-Tag falsch** → eingehende Support-Mails verloren | mittel | hoch | MX-Switch **eine Woche vor** Cut-Over auf neue Workspace (beide Workspaces parallel mit Catchall); Auto-Forward während Übergang |
| R10 | **Markmate-Bankkonto noch nicht eröffnet** am Stripe-KYC-Tag | mittel | hoch (KYC verzögert) | C2 als allererster Markmate-Schritt; ggf. übergangsweise mit Notar-Treuhandkonto-Bestätigung |
| R11 | **SMTP für Support-/Auth-Mails** (gannaca-Workspace) bricht bei Workspace-Übergang | hoch | hoch (User bekommen keine Mails) | Übergangs-SMTP-Provider (Resend, Mailgun) für 30 Tage parallel; SPF/DKIM/DMARC sorgfältig neu setzen |
| R12 | **Mel-private API-Keys** (OpenAI, Gemini) noch im Code/Git-History | hoch (oft so) | sehr hoch (Datenleck) | A1-Inventur findet das, Keys rotiert vor Git-Push auf neuen Repo; alte Keys revoke nach Cut-Over |
| R13 | **Vercel-Build-Cache** des neuen Projekts noch leer → erster Build langsam | niedrig | niedrig | Cut-Over-Vorabbuild laufen lassen |
| R14 | **OpenAI/Gemini Org-Verify** dauert wegen Telefon-Verifikation | niedrig | mittel | Moritz' Handy bereit halten in B7/B8 |
| R15 | **Steuerlich:** Übergang gannaca→Markmate ohne Aktivkauf-Vertrag = potentiell verdeckte Gewinnausschüttung | mittel | hoch (juristisch) | C10 Übernahme-Vereinbarung mit Steuerberater **vor** Cut-Over |

---

## 8. Per-Dienst-Checklisten

### 8.1 GitHub

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Org angelegt | ☐ |
| Plan ausgewählt (Team / Free) | ☐ |
| Mel als temporärer Org-Admin, Moritz als Owner | ☐ |
| Repo `korrekturpilot` von Mel-Privat zu Markmate-Org transferiert | ☐ |
| Branches komplett da (`main`, Feature-Branches) | ☐ |
| GitHub Actions / Secrets: ENV-Secrets neu setzen (falls verwendet) | ☐ |
| Vercel-GitHub-Integration neu autorisiert (für Markmate-Org) | ☐ |
| Codeowners / Branch-Protection neu konfiguriert | ☐ |
| Webhooks (falls vorhanden) neu angelegt | ☐ |
| Issue-Templates, Labels migriert | ☐ |
| Mel als Admin nach Cut-Over+30 Tage entfernt | ☐ |

### 8.2 Supabase

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Org angelegt | ☐ |
| Neues Projekt `korrekturpilot-prod` in Region EU-Central angelegt | ☐ |
| `pg_dump` (Schema + Daten) aus alter DB | ☐ |
| Schema in neue DB eingespielt | ☐ |
| RLS-Policies aktiv (verifiziert via Test-User) | ☐ |
| Storage-Buckets identisch angelegt | ☐ |
| Storage-Policies aus `006_create_storage_policies.sql` aktiv | ☐ |
| Storage-Objekte kopiert (Count alt = Count neu) | ☐ |
| Auth-Provider neu konfiguriert (Email, ggf. OAuth) | ☐ |
| Auth-Email-Templates (Confirm, Magic-Link, Reset) aus altem Projekt repliziert | ☐ |
| Auth-Redirect-URLs: Production-Domain `korrekturpilot.de/auth/callback` + Preview-Domains | ☐ |
| SMTP für Auth-Mails konfiguriert (Markmate-Workspace oder Resend) | ☐ |
| Auth-User importiert mit `password_hash` (Verifikation: Test-Login mit altem Passwort) | ☐ |
| Service-Role-Key, Anon-Key, URL in Vercel-ENV gesetzt | ☐ |
| Backups aktiviert (Daily) | ☐ |
| Altes Projekt paused (nicht deleted) für ≥30 Tage | ☐ |

### 8.3 Vercel

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Team angelegt (Pro-Plan) | ☐ |
| Neues Projekt aus Markmate-GitHub-Repo verbunden | ☐ |
| Alle 9 ENV-Variablen gesetzt (Production + Preview) | ☐ |
| Build erfolgreich auf Preview | ☐ |
| Custom Domain `korrekturpilot.de` hinzugefügt (vorab, DNS-Verifikation später) | ☐ |
| `www.korrekturpilot.de` Redirect konfiguriert (falls genutzt) | ☐ |
| Vercel-Logs gepflegt (Drain auf Datadog/Logtail falls vorhanden) | ☐ |
| Edge-Funktionen / Cron-Jobs aus altem Projekt übernommen | ☐ |
| Old Project nach Cut-Over paused, nicht deleted | ☐ |

### 8.4 Stripe

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Account angelegt | ☐ |
| KYC-Daten eingereicht: HR-Auszug, GF-Ausweis, USt-ID, IBAN | ☐ |
| KYC genehmigt (von Stripe) | ☐ |
| Produkte angelegt (mind. „25er Paket", „Einzelkorrektur") | ☐ |
| Preise angelegt → neue `price_xxx` IDs notiert | ☐ |
| `STRIPE_SECRET_KEY` (live) in Vercel | ☐ |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PACKAGE_25` neu in Vercel | ☐ |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ONE_TIME` neu in Vercel | ☐ |
| Webhook-Endpoint 1: `https://korrekturpilot.de/api/webhook` mit Events | ☐ |
| Webhook-Endpoint 2: `https://korrekturpilot.de/api/webhooks/stripe` mit Events | ☐ |
| Webhook-Endpoint 3: `https://korrekturpilot.de/api/stripe/webhook` mit Events | ☐ |
| `STRIPE_WEBHOOK_SECRET` für alle drei in Vercel (ggf. einzeln, falls Code unterscheidet) | ☐ |
| Customer-Portal konfiguriert (Cancellation, Branding, Logo) | ☐ |
| Tax-Settings (DE 19% / EU-OSS) konfiguriert | ☐ |
| Bestandskunden-Strategie entschieden (S1 / S2 / S3) und ausgeführt | ☐ |
| Live-Test 1 € + sofortige Erstattung erfolgreich | ☐ |
| Alter Stripe-Account: Webhooks disabled nach Cut-Over | ☐ |
| Alter Stripe-Account: 30 Tage Frist, dann Daten archiviert (10 J. Buchhaltung!) | ☐ |

### 8.5 OpenAI

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Organization in OpenAI angelegt | ☐ |
| Karte hinterlegt, $50–100 Prepaid eingezahlt → Tier 2 | ☐ |
| API-Key generiert | ☐ |
| `OPENAI_API_KEY` in Vercel-ENV | ☐ |
| Spending-Limit + Usage-Alert gesetzt | ☐ |
| Test-Call gegen `/api/grade` erfolgreich auf Preview | ☐ |
| Mel's alter Personal-Key revoked nach Cut-Over | ☐ |

### 8.6 Google Gemini

| Schritt | Status-Feld |
|---------|-------------|
| Google Cloud Project unter Markmate-Workspace angelegt | ☐ |
| Vertex AI / AI Studio API aktiviert | ☐ |
| Billing-Konto verknüpft | ☐ |
| API-Key generiert (oder Service-Account-JSON, je nach Setup) | ☐ |
| `GOOGLE_AI_KEY` in Vercel | ☐ |
| Test-Call gegen `/api/extract` (handgeschriebenes PDF) erfolgreich | ☐ |
| Mel's alter Personal-Key revoked nach Cut-Over | ☐ |

### 8.7 Domain `korrekturpilot.de`

| Schritt | Status-Feld |
|---------|-------------|
| Bei altem Registrar (gannaca): Whois unlock, AuthCode anfordern | ☐ |
| Bei neuem Registrar (Markmate): Transfer-In gestartet, AuthCode eingegeben | ☐ |
| Transfer-Bestätigungsmail im Markmate-Postfach beantwortet | ☐ |
| 5–7 Tage Wartezeit | ☐ |
| Domain-Status: bei Markmate-Registrar aktiv | ☐ |
| Aus A7-Export: alle DNS-Records am neuen Registrar replizieren (A, AAAA, MX, TXT, DKIM, SPF, DMARC, CNAME `www`) | ☐ |
| TTL aller Records auf 300s gesetzt (eine Woche vor Cut-Over) | ☐ |
| A-Record / CNAME `@` zeigt am Cut-Over-Tag auf neue Vercel-Adresse | ☐ |
| TTL nach erfolgreichem Cut-Over zurück auf 3600s | ☐ |

### 8.8 Google Workspace

| Schritt | Status-Feld |
|---------|-------------|
| Markmate-Workspace auf `markmate.de` angelegt | ☐ |
| Moritz als Admin, Mel als temporärer Super-Admin | ☐ |
| Aliasdomain `korrekturpilot.de` hinzugefügt (geht erst nach Domain-Transfer abgeschlossen) | ☐ |
| Postfächer aus alter Workspace migriert (Google Workspace Migration Tool) | ☐ |
| `support@korrekturpilot.de` und andere Funktions-Adressen aktiv | ☐ |
| MX-Records am neuen Registrar zeigen auf Google-Workspace-MX | ☐ |
| SPF + DKIM + DMARC für `korrekturpilot.de` neu konfiguriert | ☐ |
| Test: Mail an `support@korrekturpilot.de` kommt an | ☐ |
| Code: `SMTP_USER` / `SMTP_PASS` (App-Password im neuen Workspace) in Vercel-ENV | ☐ |
| Alte Workspace nach Cut-Over+30 Tage gekündigt | ☐ |

---

## 9. Gesamt-Zeitschätzung

### 9.1 Aufgeschlüsselt

| Kategorie | Min | Max | Bemerkung |
|-----------|-----|-----|-----------|
| **[M] Mel-Solo (Vorarbeit + Cut-Over)** | 12 h | 22 h | inklusive Cut-Over-Tag |
| **[CW] Co-Working live (Mel + Moritz)** | 7 h | 11 h | gestaffelt über mehrere Termine, idealerweise 2–3 Sessions |
| **[MM] Markmate ohne Mel** | 5 h | 11 h | parallel zu A/B, eigene Pace |
| **[W] Reine Wartezeit** | 2 Wochen | 6 Wochen | KYC + Domain-Transfer + GmbH-Eintrag dominieren |
| **Cut-Over-Tag (sub)** | 2.5 h | 4 h | davon ≥1 h Moritz dabei |

### 9.2 Kalendarisch realistisch

| Szenario | Kalenderzeit ab Start |
|----------|------------------------|
| **Best case** (Markmate-Setup vorab fertig, alle KYC sofort durch, Domain-Transfer reibungslos) | **2 Wochen** |
| **Realistisch** | **3–4 Wochen** |
| **Worst case** (KYC-Rückfragen, Notar-Verzögerung Gründung, Stripe-Support für S1) | **6–8 Wochen** |

### 9.3 Co-Working-Anteil separat (= Moritz' Kalender blocken)

| Session | Dauer | Inhalt |
|---------|-------|--------|
| Session 1 | 2–3 h | B2 Google Workspace, B3 team@-Mail, B4 GitHub, B5 Supabase, B6 Vercel, B10 Registrar, B15 2FA für alle |
| Session 2 | 2–3 h | B7 OpenAI, B8 Gemini, B9 Stripe-Anlage, B11 Repo-Transfer, B12 Vercel-Domain |
| Session 3 | 1–2 h | B13 Stripe-Webhooks, B14 Stripe-Test, B16 Domain-Transfer einleiten |
| Session 4 (Cut-Over-Tag) | 1–2 h | B18 Live-Switch, Stripe-Live-Test, ggf. 2FA |
| **Summe Moritz' Zeit** | **6–10 h** | über ~3–4 Wochen verteilt |

---

## 10. Übergabe-Output für Moritz (nach Cut-Over)

Nicht-technisches Dokument für Moritz (separat von diesem Plan), das Mel am Cut-Over-Tag abschließt:

- 1Password-Vault „Markmate-Produktion" mit allen Zugängen + Recovery-Codes
- Liste der Monatskosten pro Dienst (geschätzt)
- Wer wann was bei Problemen tut: Vercel-Status, Supabase-Status, Stripe-Webhook-Dashboard
- Notfall-Rollback-Anleitung (für ≥30 Tage, solange alte Systeme paused sind)
- Kontakt eines technischen Dienstleisters (falls Moritz allein nicht fortfahren kann)

---

## 11. Definition of Done

Migration ist abgeschlossen, wenn alle folgenden Punkte ✅:

1. `korrekturpilot.de` löst auf neue Vercel-IP auf (alle DNS-Resolver weltweit)
2. Test-User-Login mit alten Credentials funktioniert (ohne Reset)
3. Test-Upload + Korrektur durchläuft End-to-End auf neuer Infra
4. Stripe-Live-Checkout erzeugt Customer + Webhook + Credits-Gutschrift
5. Support-Mail kommt an `support@korrekturpilot.de` an
6. Impressum/AGB/Datenschutz nennen Markmate GmbH
7. Mel ist aus keinem Markmate-Account mehr als Admin gelistet (nach 30 Tagen)
8. Alte gannaca-Services sind paused (nicht deleted) — Anker für 30-Tage-Rollback
9. Übernahme-Vereinbarung gannaca↔Markmate ist unterzeichnet
10. Moritz hat Vault + Übergabe-Doku
