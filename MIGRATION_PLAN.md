# KorrekturPilot — Migrationsplan: gannaca → Markmate (in Gründung)

**Stand:** 2026-05-12

## Klarstellung der Ausgangslage

**Heute (Ist):**
- KorrekturPilot wird operativ von **gannaca GmbH & Co. KG** betrieben.
- Abrechnung läuft komplett über gannaca: **OpenAI, Gemini, Supabase** auf gannaca-Kreditkarte (sehr wahrscheinlich auch Vercel, Stripe-Auszahlung, Domain-Registrar, Google Workspace).
- Mel hält teilweise noch persönliche Identitäten / API-Keys / GitHub-Repo-Ownership.
- Es existiert **eine einzelne Gmail-Adresse** (`korrekturpilot@gmail.com` o. ä.) als KorrekturPilot-Identität — sonst nichts auf Produkt-Seite.
- **Markmate GmbH existiert noch NICHT.**

**Zielzustand:**
- Markmate GmbH (gegründet durch **Christopher + Mel**, „C+M") ist alleinige rechtliche und operative Betreiberin.
- Nichts mehr auf gannaca-Accounts, nichts mehr auf privaten Mel-Accounts.
- Christopher führt operativ weiter, Mel ist nach Cut-Over draußen.

**Wichtigster Strukturwechsel zum vorigen Plan:**
Bis Markmate als juristische Person existiert + Bankkonto + Geschäftskarte hat, ist die finale Migration **nicht möglich** (insbesondere Stripe-KYC, Vertragsabschlüsse, AVV). Der Plan zerfällt in **vier Phasen**, davon ist Phase 1 eine reine Wartezeit ohne Mel-Aufwand.

---

## Lesart der Tags

| Tag | Bedeutung |
|-----|-----------|
| **[M]** | Mel SOLO (mit KI / Claude Code) |
| **[CW]** | Co-Working LIVE Mel + Christopher (2FA, Account-Erstellung, Karten-Zugriff) |
| **[MM]** | Markmate-/Christopher-Aufgabe OHNE Mel (Gründung, Bank, KYC, Karte) |
| **[W]** | Reine Wartezeit (keine Arbeitszeit) |

Zeiten = realistische Bandbreiten, kein Padding.

---

## Phasen-Übersicht

```
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 0 — SOFORT (Mel + 1x Christopher), Woche 1–2                │
│   - Inventur, Code säubern, Mel raus aus privaten Keys           │
│   - Markmate-Domain reservieren                                   │
│   - Vault, Daten-Export-Skripte vorbereiten                       │
│   - gmail-Identität konsolidieren (zugänglich für Christopher)    │
│   ABRECHNUNG bleibt: gannaca-Karte                                │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 1 — MARKMATE GRÜNDEN (C+M extern), Woche 2–8                │
│   - Notar, HR-Eintrag, USt-ID                                     │
│   - Geschäftsbankkonto                                             │
│   - Geschäftskreditkarte                                           │
│   PARALLEL möglich: Phase 0 fertigstellen                         │
│   Mel-Aufwand: ~0 (Beratung max.)                                 │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 2 — ACCOUNT-MIGRATION (Mel + CW), Woche 8–10               │
│   - Markmate-Orgs anlegen (GitHub, Vercel, Supabase, OpenAI…)    │
│   - Karten umstellen: gannaca → Markmate                          │
│   - Stripe-KYC (Wartezeit 1–3 Werktage)                          │
│   - Domain-Transfer (Wartezeit 5–7 Tage)                          │
│   - Google Workspace Markmate                                     │
│   - Code, Daten, Vercel-Projekt vorbereiten                       │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 3 — CUT-OVER (CW 1 Tag), Woche 10                           │
│   - DNS-Switch, ENV-Switch, Webhook-Switch                        │
│   - 2.5–4 h, Christopher dabei für 1–2 h                          │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 4 — ÜBERGABE & MEL-ABGANG, Woche 10–14                     │
│   - 30 Tage alte Systeme paused (Rollback-Anker)                 │
│   - Mel als Admin entfernt überall                                │
│   - Übernahme-Vereinbarung gannaca↔Markmate                       │
└───────────────────────────────────────────────────────────────────┘
```

Realistischer Kalenderkorridor: **8–14 Wochen ab heute**, dominiert durch GmbH-Gründung + Bankkonto + Stripe-KYC (alles Wartezeit).

---

## Technische Inventur (verifiziert im Repo)

| Dienst | Aktuelle Lage | Env-Variablen / Endpoints |
|--------|---------------|----------------------------|
| **GitHub** | Repo bei Mel privat (`8melc/korrekturpilot`) | — |
| **Supabase** | gannaca-Org, gannaca-Karte; 10 Migrationen + Storage + Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Vercel** | gannaca-Team / Mel privat (zu prüfen!), gannaca-Karte | trägt alle anderen ENV |
| **Stripe** | gannaca-Account, Auszahlung an gannaca-IBAN; **drei** aktive Webhook-Pfade im Code | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ID_PACKAGE_25`, `NEXT_PUBLIC_STRIPE_PRICE_ID_ONE_TIME`; Endpoints `/api/webhook`, `/api/webhooks/stripe`, `/api/stripe/webhook` |
| **OpenAI** | Mel privat **oder** gannaca-Org (zu prüfen!), gannaca-Karte | `OPENAI_API_KEY` |
| **Google Gemini** | Mel privat **oder** gannaca, gannaca-Karte | `GOOGLE_AI_KEY` |
| **Domain `korrekturpilot.de`** | gannaca-Registrar | DNS-Zone |
| **Google Workspace** | gannaca-Workspace mit Aliasdomain `korrekturpilot.de` | SMTP für Auth + Support (`SMTP_HOST/USER/PASS/FROM`) |
| **`korrekturpilot@gmail.com`** | existiert, Owner = ? (Mel? Christopher? geteilt?) | — |

**Aktionspflicht Phase 0:** Ownership jeder Zeile dieser Tabelle eindeutig dokumentieren. „Vermutlich" reicht nicht.

---

## PHASE 0 — Sofort-Maßnahmen (Woche 1–2)

Ziel: Mel raus aus privaten Identitäten, Vorbereitung der finalen Migration, gmail-Adresse als belastbare Übergangs-Identität.

### 0.1 Solo-Arbeit Mel

| # | Aufgabe | Zeit |
|---|---------|------|
| 0.M.1 | **Ownership-Inventur**: für jeden Dienst (Supabase, Vercel, Stripe, OpenAI, Gemini, Domain, Workspace) Owner-E-Mail, Billing-Karte, 2FA-Methode dokumentieren. Output: Tabelle in Vault | 1–2 h |
| 0.M.2 | **Code-Grep**: alle Stellen mit gannaca-Strings, privaten Mel-Mails, hardkodierten Account-Identifikatoren finden. Output: Liste mit Datei-Pfaden + Zeilen | 1 h |
| 0.M.3 | **ENV-Inventar**: Vercel-ENV (Production + Preview) auslesen, in Vault. Markieren: welche Werte sind „privat Mel" (zu rotieren) vs. „gannaca-shared" | 0.5 h |
| 0.M.4 | **Supabase-Export-Skripte vorbereiten** (laufen jetzt nur als Trockenübung): `pg_dump` Schema/Daten, Storage-Listing, Auth-User-Export mit `encrypted_password`. Output: 3 Bash-Skripte im Repo | 2–3 h |
| 0.M.5 | **Stripe-Bestandsdaten exportieren** (Customers, Subscriptions, Invoices, Products, Prices, Coupons als CSV) — Snapshot, falls bei Migration etwas verloren geht | 1 h |
| 0.M.6 | **DNS-Zone exportieren** als Zonefile (A, AAAA, CNAME, MX, TXT/SPF/DKIM/DMARC) — Snapshot, Quelle der Wahrheit fürs spätere Replizieren | 0.5 h |
| 0.M.7 | **Code-PR vorbereiten** (NICHT mergen): alle gannaca-Strings durch Markmate-Platzhalter ersetzen. Branch parat für Cut-Over | 1–2 h |
| 0.M.8 | **TTL aller DNS-Records auf 300s senken** (1 Woche vor späterem Cut-Over wirksam, aber jetzt schon harmlos) — kann auch erst in Phase 2 passieren | 0.25 h |
| **Summe** | | **~7–10 h** |

### 0.2 Co-Working Mel + Christopher (1 Session, ca. 2 h)

| # | Aufgabe | Zeit |
|---|---------|------|
| 0.CW.1 | **Vault aufsetzen** (1Password / Bitwarden Business, **getrennt von gannaca-Vault**) — wird Markmates Geheimnis-Speicher. Beide haben Zugang, Recovery-Codes physisch sichern | 0.5 h |
| 0.CW.2 | **gmail-Adresse `korrekturpilot@gmail.com` konsolidieren**: Recovery-Phone auf Christophers Handy, Recovery-Mail auf Christophers Privat-Mail, 2FA auf Authenticator beider Personen, Passwort im Vault. **Ziel:** wenn Mel weg ist, Christopher hat vollen Zugriff | 0.5 h |
| 0.CW.3 | **Markmate-Domain `markmate.de` reservieren** — auf Christopher privat (oder Mel privat) bei einem neutralen Registrar (nicht gannaca!). Kostet 10–20 €. Spätere Übertragung auf GmbH ist trivial. **Jetzt sichern, sonst Risiko, dass jemand anders die Domain kauft** | 0.5 h |
| 0.CW.4 | **Mel-private API-Keys rotieren** (falls vorhanden im Code/Vercel-ENV): neue OpenAI- und Gemini-Keys unter gannaca-Org / gannaca-Karte generieren, alte Mel-private Keys revoken. Vercel-ENV updaten. **Damit ist Mel schon JETZT raus aus persönlichen Keys, auch ohne Markmate.** | 0.5 h |
| **Summe** | | **~2 h live** |

### 0.3 Markmate / Christopher solo (parallel oder vor Phase 1)

| # | Aufgabe | Zeit |
|---|---------|------|
| 0.MM.1 | **Anwalt + Notar terminieren** für GmbH-Gründung | 0.5 h Calls |
| 0.MM.2 | **Bank vorbeurteilen lassen** (Qonto, Finom, Postbank, Sparkasse): welche bietet Geschäftskonto für GmbH i.G. mit kurzer TTL? | 0.5 h |

### 0.4 Was am Ende von Phase 0 erreicht ist

- Vollständige Inventur, alle Geheimnisse im Markmate-Vault.
- Markmate-Domain gesichert.
- Mel raus aus persönlichen Keys.
- Gmail-Identität für Christopher zugänglich (Bus-Faktor > 1).
- Snapshots aller Daten gezogen (zur Sicherheit, falls in Phase 2 etwas schiefgeht).
- Code-PR-Branch mit Markmate-Strings liegt bereit.

**Phase 0 ist eigenständig wertvoll**, auch wenn Markmate-Gründung sich verzögert. Mel ist danach schon zu 30 % „raus".

---

## PHASE 1 — Markmate-Gründung (Woche 2–8, Wartezeit)

Reiner Markmate-Prozess. Mel ist nicht beteiligt (außer Gründungs­vertrag mitunter­zeichnen, falls Gesellschafter).

| # | Aufgabe | Akteur | Wartezeit |
|---|---------|--------|-----------|
| 1.MM.1 | Notarvertrag aufsetzen + beurkunden | Notar + C+M | 0.5–2 Wochen (W) |
| 1.MM.2 | Stammkapital einzahlen (Gründungskonto bei Bank) | C+M | 0.5–1 Woche (W) |
| 1.MM.3 | Handelsregister-Eintragung | Amtsgericht | 1–4 Wochen (W) |
| 1.MM.4 | Steuerliche Anmeldung beim Finanzamt, USt-ID beantragen | Steuerberater | 1–4 Wochen (W) |
| 1.MM.5 | Geschäftsbankkonto endgültig eröffnen (nach HR-Eintrag) | C+M | 1–2 Wochen (W) |
| 1.MM.6 | Geschäftskreditkarte (Debit oder Credit) ausstellen lassen | Bank | 1–2 Wochen (W) |
| 1.MM.7 | **Übernahme-Vereinbarung gannaca ↔ Markmate** entwerfen (Kaufpreis Software / Daten / Kundenstamm, Stichtag, IP-Übergang) | Anwalt + C+M | 1–3 Wochen (W) parallel |
| 1.MM.8 | Impressum, AGB, Datenschutz, DPA-Templates für Markmate vorbereiten (Anwalt) | Anwalt | 1–2 Wochen (W) parallel |
| **Kalenderdauer Phase 1** | | | **4–10 Wochen** |

**Mel-Aufwand in Phase 1: nahezu 0.** Beratung max., kein operativer Aufwand.

**Wichtig:** Phase 0 muss in Woche 1–2 starten und kann parallel zu Phase 1 abgeschlossen sein. So sind in Woche 8 (Idealfall) sowohl Markmate gegründet als auch alles für die technische Migration vorbereitet.

---

## PHASE 2 — Account-Migration (Woche 8–10, nach GmbH-Eintrag + Karte)

Voraussetzung: HR-Eintrag liegt vor, Geschäftskonto + Karte verfügbar.

### 2.1 Solo-Arbeit Mel

| # | Aufgabe | Zeit | Abhängigkeit |
|---|---------|------|--------------|
| 2.M.1 | **Neues Supabase-Projekt** (Markmate-Org) aufsetzen: Schema einspielen (aus 0.M.4), RLS-Policies, Storage-Buckets neu anlegen, Auth-Settings (SMTP, Templates, Redirect-URLs) replizieren | 1.5–2.5 h | 2.CW.3 |
| 2.M.2 | **Storage-Daten kopieren** (alt → neu, idempotent, Count-Verifikation) | 0.5–2 h | 2.M.1 |
| 2.M.3 | **Auth-User importieren** mit `encrypted_password` → kein Passwort-Reset für User | 0.5–1 h | 2.M.1, 0.M.4 |
| 2.M.4 | **Neues Vercel-Projekt** (Markmate-Team), Git-Connection auf Markmate-GitHub-Repo, alle ENV-Variablen neu setzen | 1–1.5 h | 2.CW.2, 2.CW.4 |
| 2.M.5 | **Code-PR mergen** (aus 0.M.7): Impressum, AGB, Datenschutz, Mailer-`from`, Support-Mail-Adresse, README → Markmate-Daten | 0.5 h | 1.MM.8 (Texte da) |
| 2.M.6 | **DNS-Zone bei Markmate-Registrar replizieren** (aus 0.M.6 Zonefile), TTL auf 300s | 0.5 h | 2.CW.6 |
| 2.M.7 | **Preview-Deploy-Tests**: Login mit migriertem User, Upload, Korrektur-Flow, Stripe-Test-Checkout, Webhook-Receipt, Support-Mail | 1–2 h | 2.M.1–2.M.4, 2.CW.5 |
| 2.M.8 | **Cut-Over-Runbook** schreiben (siehe §3) | 0.5 h | — |
| **Summe** | | **~6–10 h** | |

### 2.2 Co-Working Mel + Christopher (3–4 Sessions)

| # | Aufgabe | Zeit live | Wartezeit |
|---|---------|-----------|-----------|
| 2.CW.1 | **Markmate Google Workspace** auf `markmate.de` einrichten, Admin = Christopher, Mel temporär Super-Admin. Postfach `team@markmate.de` | 1 h | DNS-Verify 0–24 h (W) |
| 2.CW.2 | **Markmate GitHub Organization** anlegen, Plan wählen, Christopher = Owner | 0.25 h | — |
| 2.CW.3 | **Markmate Supabase Organization** anlegen, **Markmate-Karte** hinterlegen | 0.25 h | — |
| 2.CW.4 | **Markmate Vercel Team** (Pro-Plan), Markmate-Karte | 0.25 h | — |
| 2.CW.5 | **Stripe Markmate-Account** anlegen, KYC-Daten eingeben (HR-Auszug, GF-Ausweis, USt-ID, IBAN, Markmate-Adresse) | 0.5–1 h | KYC 1–3 Werktage (W) |
| 2.CW.6 | **Markmate-Domain-Registrar-Account** für `korrekturpilot.de`-Transfer-Ziel anlegen, Karte hinterlegen | 0.25 h | — |
| 2.CW.7 | **OpenAI-Org auf `team@markmate.de` migrieren** ODER neue Markmate-Org anlegen — beide Optionen prüfen (Org-Owner-Wechsel in OpenAI ist möglich); Karte gannaca → Markmate tauschen; $50–100 Prepaid → Tier 2 | 0.5–1 h | Tier-Erhöhung 0–7 Tage (W) |
| 2.CW.8 | **Google Cloud / Gemini**: neues GCP-Projekt unter Markmate-Workspace, Markmate-Billing-Konto, API aktivieren, neue Keys generieren | 0.5–1 h | — |
| 2.CW.9 | **Repo-Transfer GitHub** Mel-Privat → Markmate-Org (Mel klickt Transfer, Christopher bestätigt). Vercel-GitHub-Integration neu autorisieren | 0.5 h | — |
| 2.CW.10 | **Vercel-Custom-Domain** `korrekturpilot.de` im neuen Projekt vorbereiten (DNS-Switch erst beim Cut-Over) | 0.25 h | — |
| 2.CW.11 | **Stripe-Webhook-Endpoints** im neuen Stripe anlegen — **alle drei Pfade** (`/api/webhook`, `/api/webhooks/stripe`, `/api/stripe/webhook`), Signing-Secrets in Vercel-ENV des neuen Projekts | 0.5 h | nach 2.CW.5 KYC-Freigabe |
| 2.CW.12 | **Stripe-Produkte + Preise** im neuen Konto identisch neu anlegen → neue Price-IDs notieren, in Vercel-ENV setzen (`NEXT_PUBLIC_STRIPE_PRICE_ID_*`) | 0.5 h | — |
| 2.CW.13 | **2FA für alle Markmate-Accounts**: Authenticator-App auf Christophers Gerät (zusätzlich Mel temporär), Recovery-Codes im Vault | 1 h kumuliert | — |
| 2.CW.14 | **Domain-Transfer einleiten**: bei gannaca-Registrar Whois-Unlock + AuthCode anfordern → bei Markmate-Registrar Transfer-In starten → Bestätigungs-Mail im Markmate-Registrar-Postfach beantworten | 0.5 h | Registrar-Sperre 5–7 Tage (W) |
| 2.CW.15 | **Karten-Switch bei gannaca-Konten**: bei jedem aktuellen gannaca-Account (Supabase-gannaca-Org, Vercel-gannaca-Team etc.) Billing-Karte austauschen ist **NICHT der Pfad** — stattdessen neue Markmate-Orgs nutzen (siehe oben). Für Phase 2 muss aber gannaca-Karte bei alten Orgs **bleiben**, bis Cut-Over abgeschlossen ist (Service darf nicht ausfallen) | 0 h | — |
| 2.CW.16 | **Stripe-Live-Test** (1 € echter Checkout mit Markmate-Karte, danach Refund) | 0.5 h | — |
| **Summe live** | | **~6–8 h verteilt auf 3–4 Sessions** | |

### 2.3 Markmate / Christopher solo

| # | Aufgabe | Zeit | Wartezeit |
|---|---------|------|-----------|
| 2.MM.1 | KYC-Dokumente bei Stripe einreichen (Pass/Perso GF, HR-Auszug, USt-Bescheid, IBAN-Nachweis) | 0.5–1 h | Stripe-Prüfung 1–3 WT (W) |
| 2.MM.2 | AVV (Auftrags­verarbeitungs-Verträge) im jeweiligen Dashboard akzeptieren: Supabase, Vercel, OpenAI, Google Cloud, Stripe | 1 h | — |
| 2.MM.3 | Domain-Transfer-Bestätigung im neuen Registrar-Postfach annehmen | 0.1 h | — |
| 2.MM.4 | Anwalt-Review: finale Impressum/AGB/DP-Texte freigeben (für 2.M.5) | extern | 1–5 Tage (W) |
| 2.MM.5 | User-Kommunikations-Mail freigeben (Migrations-Ankündigung, siehe §4.4) | 0.25 h | — |
| **Summe** | | **~2–3 h** | |

---

## PHASE 3 — Cut-Over (1 Tag, Co-Working)

Voraussetzung: alles aus Phase 2 grün, Preview-Smoketests bestanden, Stripe-KYC durch, Domain transferiert, DNS-TTL ≥ 1 Woche auf 300s.

Zeitfenster: **Sonntag früh 06:00–10:00** (niedrige Last).

### 3.1 T-7 Tage (vorbereitend)

| # | Aktion | Wer |
|---|--------|-----|
| 3.CO-1 | User-Banner + Mail: „Am [Datum] 06:00–10:00 ggf. 15 Min Downtime, einmal neu einloggen" | [M] |
| 3.CO-2 | Finale DNS-TTL-Verifikation (alle Records auf 300s) | [M] |
| 3.CO-3 | Alle ENV im neuen Vercel-Projekt nochmal durchgehen | [M] |
| 3.CO-4 | Letzter pg_dump + Storage-Sync 1 Tag vor Cut-Over (Delta beim Cut-Over kleiner) | [M] |

### 3.2 T-0 Cut-Over-Tag — Reihenfolge

Der Point of No Return liegt bei **Schritt 9** (DNS-Switch). Davor: voll rückrollbar.

| # | Aktion | Dauer | Wer | Rollback |
|---|--------|-------|-----|----------|
| 1 | Maintenance-Banner aktivieren | 5 min | [M] | ja |
| 2 | Stripe-Webhooks im **alten** (gannaca) Konto disablen | 5 min | [M] | ja |
| 3 | Final-Delta-pg_dump (Tabellen mit `updated_at > letzter_dump`) + Storage-Sync der letzten 24 h | 15–30 min | [M] | ja |
| 4 | Delta in neue Supabase einspielen, idempotent (`INSERT … ON CONFLICT UPDATE`) | 10 min | [M] | ja |
| 5 | Auth-User-Delta (neue Registrierungen seit 2.M.3) nachziehen | 10 min | [M] | ja |
| 6 | Verifikations-Skript: Row-Counts alt vs. neu, Storage-Object-Counts | 10 min | [M] | n/a |
| 7 | Preview-Smoke-Test mit migriertem Test-User | 15 min | [M] | ja |
| 8 | Vercel: Custom Domain `korrekturpilot.de` im neuen Projekt auf Production setzen (DNS-Werte ablesen) | 5 min | [M] | ja |
| 9 | 🚨 **DNS-Switch**: Bei Markmate-Registrar A-Record / CNAME auf neue Vercel-Adresse umstellen | 5 min | [M] / [CW] falls 2FA | nur via DNS-Rollback |
| 10 | DNS-Propagation: `dig` gegen 8.8.8.8 und 1.1.1.1 abwarten | 10–60 min (W) | [M] beobachtet | — |
| 11 | Vercel-Domain-Status „Ready" + SSL-Cert verifiziert | 5 min | [M] | — |
| 12 | Stripe-Webhooks im **neuen** Konto enablen | 5 min | [M] | ja |
| 13 | Stripe-Live-Test: 1 € echter Checkout mit Christophers Karte, Webhook-Receipt, Credits-Gutschrift, danach Refund | 15 min | [M] + [CW] | n/a |
| 14 | **MX-Records umstellen** auf Markmate-Google-Workspace (falls Workspace-Wechsel zeitgleich passiert; sonst MX bleibt vorerst gannaca, separater späterer Schnitt) | 5 min | [M] | ja |
| 15 | Altes Vercel-Projekt (gannaca) auf „paused" (NICHT löschen) | 5 min | [M] | jederzeit reaktivierbar |
| 16 | Maintenance-Banner entfernen, „Wir sind zurück"-Mail | 5 min | [M] | ja |
| 17 | 24h-Monitoring: Vercel-Logs, Supabase-Logs, Stripe-Webhook-Dashboard, OpenAI/Gemini-Usage | passiv | [M] | — |
| **Cut-Over netto** | | **~2.5–4 h** | | |

### 3.3 Rollback-Plan (falls 9–13 schiefläuft)

1. DNS-Switch zurück (TTL 300s ⇒ max 5 Min Propagation).
2. Stripe-Webhooks im neuen Konto disablen, im alten re-enablen.
3. Vercel: altes Projekt wieder als Production.
4. Maintenance-Banner aktiv lassen.
5. Post-mortem, neuer Cut-Over-Termin.

Solange alte Supabase, alte Stripe-Konfig, altes Vercel-Projekt **nicht gelöscht** → Rollback < 30 Min jederzeit möglich. **Daher: alte Systeme mindestens 30 Tage paused parallel halten.**

---

## PHASE 4 — Übergabe und Mel-Abgang (Woche 10–14)

| # | Aufgabe | Wer |
|---|---------|-----|
| 4.1 | 30 Tage Monitoring auf neuer Infra, gannaca-Systeme paused als Rollback-Anker | [M] passiv + [CW] |
| 4.2 | Übergabe-Doku für Christopher (nicht-techn.): Vault-Übersicht, Monatskosten-Liste, „Wenn etwas brennt"-Notfallkarte, externer Dienstleister-Kontakt | [M] |
| 4.3 | Mel aus allen Markmate-Orgs als Admin entfernt: GitHub, Vercel, Supabase, Stripe, Google Workspace, Registrar, OpenAI, GCP | [CW] |
| 4.4 | gannaca-Stripe-Webhooks deaktivieren, gannaca-Stripe-Account ggf. schließen / für 10 J. archivieren (HGB-Aufbewahrung) | [MM] |
| 4.5 | gannaca-Workspace-Aliasdomain `korrekturpilot.de` entfernen | [MM] |
| 4.6 | gannaca-Supabase-Projekt nach 30 Tagen löschen (oder behalten als Archiv) | [MM] |
| 4.7 | Übernahme-Vereinbarung unterzeichnet, IP-Übergang dokumentiert | [MM] |
| **Mel-Aufwand Phase 4** | **~3–5 h verteilt über 30 Tage** | |

---

## §4 — Daten-Migration Supabase (Detail)

### 4.1 Was wird verlustfrei kopiert

| Datenkategorie | Methode |
|----------------|---------|
| Schema (`public.*`, Indizes, Constraints) | `pg_dump --schema-only` + `psql` |
| RLS-Policies, DB-Functions, Triggers | Teil des Schemas, kommt mit |
| Tabellendaten (`corrections`, `users`/Credits, `support_requests`, Stripe-Tabellen aus Migrationen 001–010) | `pg_dump --data-only` |
| Storage-Buckets (Objekte) | Supabase Storage API / `rclone` S3-kompatibel |
| Storage-Policies (`006_create_storage_policies.sql`) | Migration neu ausführen |

### 4.2 Auth-User — drei Pfade

| Option | Methode | Aufwand | User-Erlebnis |
|--------|---------|---------|---------------|
| **A (Default)** | Auth-User-Export aus `auth.users` inkl. `encrypted_password` (bcrypt) → Import via Admin-API `createUser` mit `password_hash` Parameter | 1 h Skript + Test | nahtlos, kein Passwort-Reset |
| **B (Fallback)** | Export ohne Passwort → Massen-Reset-Mail | 0.5 h + Comms | User setzt neues Passwort, Support-Last erwartbar |
| **C** | Supabase Project-Transfer-Feature (innerhalb Org) — passt nicht für Org-Wechsel | — | — |

**Empfehlung: A.** Vorab mit 5 Test-Usern auf Preview-Projekt verifizieren, dass bcrypt-Hash-Import funktioniert.

### 4.3 Was verloren geht (akzeptiert)

| Verlust | Mitigation |
|---------|------------|
| Aktive JWT-Sessions | User loggt einmal neu ein (im User-Comms-Mail kommuniziert) |
| Stripe-Customer-IDs in `users.stripe_customer_id` | siehe §5 (Stripe) |
| Logs / Audit-Trail in alter Supabase | pg_dump archivieren, 10 J. aufbewahren |
| Realtime-Verbindungen | brechen einmalig ab |

### 4.4 User-Kommunikation (Beispiel-Text)

> Wir migrieren KorrekturPilot in eine neue Betreibergesellschaft (Markmate GmbH). Am [Datum] zwischen [06:00–10:00] kann es zu ca. 15 Minuten Downtime kommen. Dein Account, deine Klausuren und dein Credits-Stand bleiben unverändert. Bitte logge dich nach dem Update einmal neu ein — dein Passwort bleibt gleich. Bei Problemen: support@korrekturpilot.de.

---

## §5 — Stripe-Migration (Detail)

**Harte Realität:** Stripe-Accounts sind nicht übertragbar. Customer-, Subscription-, Payment-Method-Tokens existieren nur im jeweiligen Account.

### 5.1 Drei Optionen

| Option | Was | Vorteil | Nachteil | Passt zu KorrekturPilot? |
|--------|-----|---------|----------|---------------------------|
| **S1 — Stripe-Support-Migration** | Stripe-Support kopiert Customers + Subscriptions + Payment-Method-Tokens zwischen Accounts | verlustfrei, Subscriptions laufen weiter | 2–6 Wo Wartezeit, beide Accounts müssen kooperieren, nicht garantiert | nur wenn echte Recurring-Subscriptions |
| **S2 — Hard-Switch + Re-Subscribe** | gannaca-Stripe Webhooks aus, neuer Account live; alte Subs auslaufen / kündigen | sauber, schnell | Churn-Risiko bei Recurring-Subs | **ja**, weil Käufe Einmal-Käufe sind (PACKAGE_25, ONE_TIME) |
| **S3 — Parallel-Betrieb** | Alte Subs laufen bei gannaca aus, neue Käufe ab Cut-Over bei Markmate | kein User-Bruch | Doppel-Buchführung 1–12 Mo, Steuer-Komplexität | als Fallback denkbar |

### 5.2 Empfehlung für KorrekturPilot

Aus Code-Befund: zwei Price-IDs (`PACKAGE_25`, `ONE_TIME`) — beides **Einmalzahlungen**, Credits liegen in Supabase. **Keine echten Recurring-Subscriptions** sichtbar.

→ **S2 (Hard-Switch).** Bestandskunden behalten ihre Credits in Supabase. Neue Käufe ab Cut-Over über Markmate-Stripe.

→ **Vorab verifizieren:** im aktuellen Stripe-Dashboard prüfen, ob es `Subscriptions` mit Status `active` gibt. Falls ja → Fallback S1 prüfen.

### 5.3 Konkrete S2-Schritte

| # | Schritt | Wer |
|---|---------|-----|
| 5.1 | Alte Produkte + Preise + IDs exportieren | [M] |
| 5.2 | Im neuen Stripe identische Produkte + Preise anlegen → neue Price-IDs | [CW] 2.CW.12 |
| 5.3 | `NEXT_PUBLIC_STRIPE_PRICE_ID_*` in Vercel-ENV auf neue Werte | [M] |
| 5.4 | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (neu) in Vercel | [M] |
| 5.5 | Alle drei Webhook-Pfade im neuen Stripe registrieren | [CW] 2.CW.11 |
| 5.6 | Nach Cut-Over: alte Subs (falls vorhanden) auf `cancel_at_period_end=true` | [M] |
| 5.7 | Idempotency: Webhook-Handler prüft `event.account` + `event.id` → keine Doppel-Buchungen | [M] Code-Review |
| 5.8 | Stripe-Tax (DE 19%, EU-OSS) im neuen Konto konfigurieren | [MM] |
| 5.9 | Customer-Portal neu konfigurieren (Branding, Cancellation) | [CW] |
| 5.10 | Bank-Auszahlungs-IBAN = Markmate-Konto | [MM] |

---

## §6 — Risiko-Liste

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|---------------------|--------|------------|
| R1 | **Markmate-GmbH-Gründung verzögert** (Notar, HR-Eintrag) | hoch | hoch (gesamter Plan stockt) | Phase 0 sofort starten, davon ist viel auch ohne Markmate wertvoll |
| R2 | **Markmate-Bankkonto-Eröffnung dauert** | mittel | hoch | mehrere Banken parallel anfragen (Qonto + traditionelle Bank) |
| R3 | **Stripe-KYC dauert > 5 WT** wegen Rückfragen | mittel | hoch | KYC 14 Tage vor Cut-Over einreichen, alle Dokumente parat |
| R4 | **Webhook-Events während Cut-Over verloren** (in 30-min-Lücke) | hoch | mittel | Maintenance-Banner blockt Checkout, Failure-Monitoring, manuelle Nacharbeit |
| R5 | **OpenAI Rate-Limit Tier 1** auf neuem Konto | hoch | hoch | $50–100 Prepaid 14 Tage vorher → Tier 2 |
| R6 | **DNS-Propagation > 60 Min** | mittel | mittel | TTL 300s eine Woche vorher; Status-Hinweis |
| R7 | **Auth-Password-Hash-Import scheitert** | mittel | hoch | Fallback B (Reset-Mail) vorbereitet, vorab mit 5 Test-Usern verifizieren |
| R8 | **Domain-Transfer vom alten Registrar verzögert** | mittel | hoch | 14 Tage Vorlauf, AuthCode-Anforderung dokumentieren |
| R9 | **Storage-URLs hartkodiert in DB-Rows** (alte Supabase-URLs) | mittel | mittel | vor 2.M.2: grep + UPDATE-Statement nach Migration |
| R10 | **SMTP-Übergang Workspace-Wechsel** → Auth/Support-Mails fallen aus | hoch | hoch | Übergangs-SMTP (Resend / Mailgun) für 30 Tage; SPF/DKIM/DMARC sorgfältig |
| R11 | **Mel-private Keys noch in Git-History** | hoch | sehr hoch (Datenleck) | 0.M.2 findet das; Keys rotieren VOR Repo-Transfer, alte revoken |
| R12 | **gmail-Account einziger Identitäts-Anker, Bus-Faktor 1** | hoch | sehr hoch | 0.CW.2 = Recovery auf Christopher, Vault, beide haben Zugriff |
| R13 | **Karten-Switch gannaca → Markmate verfrüht** → Service-Ausfall in alter Org | mittel | mittel | gannaca-Karte bei alten Orgs bis 30 Tage nach Cut-Over **drinlassen** |
| R14 | **Stripe-Idempotency-Kollision** zwischen alten + neuen Events | niedrig | mittel | Webhook-Handler prüft `account`-Feld |
| R15 | **Steuerlich: Übergang gannaca → Markmate als verdeckte Gewinnausschüttung** | mittel | hoch (juristisch) | Übernahme-Vereinbarung mit Steuerberater (1.MM.7) |
| R16 | **`markmate.de` Domain wird zwischenzeitlich von Dritten registriert** | niedrig | mittel (Branding) | 0.CW.3 = jetzt sichern |
| R17 | **OpenAI-Org-Owner-Wechsel** wird kompliziert (manche Dienste machen das schwer) | mittel | mittel | Alternative: neue Markmate-Org, alte Org parallel deaktivieren |

---

## §7 — Per-Dienst-Checklisten (komplett)

### 7.1 Identitäts-Basis

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Vault (1Password/Bitwarden) angelegt | 0 | ☐ |
| `korrekturpilot@gmail.com` Recovery + 2FA auf Christopher | 0 | ☐ |
| `markmate.de` Domain reserviert | 0 | ☐ |
| `team@markmate.de` Postfach in Markmate-Workspace aktiv | 2 | ☐ |

### 7.2 GitHub

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Org angelegt | 2 | ☐ |
| Repo `korrekturpilot` von Mel-Privat zu Markmate-Org transferiert | 2 | ☐ |
| Vercel-GitHub-Integration neu autorisiert | 2 | ☐ |
| GitHub-Actions / Secrets neu gesetzt (falls verwendet) | 2 | ☐ |
| Branch-Protection neu konfiguriert | 2 | ☐ |
| Mel als Admin nach 30 Tagen entfernt | 4 | ☐ |

### 7.3 Supabase

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Org angelegt, Markmate-Karte | 2 | ☐ |
| Neues Projekt `korrekturpilot-prod` (EU-Central) | 2 | ☐ |
| `pg_dump`-Skript getestet | 0 | ☐ |
| Schema in neue DB | 2 | ☐ |
| RLS-Policies verifiziert (Test-User-Login) | 2 | ☐ |
| Storage-Buckets + Policies repliziert | 2 | ☐ |
| Storage-Objekte kopiert, Count alt = neu | 2 | ☐ |
| Auth-Provider + SMTP konfiguriert | 2 | ☐ |
| Auth-Email-Templates repliziert | 2 | ☐ |
| Auth-Redirect-URLs gesetzt | 2 | ☐ |
| Auth-User mit `password_hash` importiert | 2 | ☐ |
| Service-Role-Key + Anon-Key + URL in Vercel | 2 | ☐ |
| Daily-Backups aktiviert | 2 | ☐ |
| Altes Projekt paused (nicht deleted) ≥ 30 Tage | 4 | ☐ |

### 7.4 Vercel

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Team (Pro-Plan) angelegt | 2 | ☐ |
| Neues Projekt aus Markmate-GitHub-Repo | 2 | ☐ |
| Alle 9 ENV-Variablen gesetzt (Prod + Preview) | 2 | ☐ |
| Build erfolgreich auf Preview | 2 | ☐ |
| Custom Domain `korrekturpilot.de` hinzugefügt | 2 | ☐ |
| `www.korrekturpilot.de` Redirect (falls genutzt) | 2 | ☐ |
| Edge-Funktionen / Cron-Jobs übernommen | 2 | ☐ |
| Altes Projekt paused nach Cut-Over | 3 | ☐ |

### 7.5 Stripe

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Account angelegt | 2 | ☐ |
| KYC eingereicht (HR-Auszug, GF-Ausweis, USt-ID, IBAN) | 2 | ☐ |
| KYC genehmigt | 2 | ☐ |
| Produkte + Preise neu angelegt, IDs notiert | 2 | ☐ |
| `STRIPE_SECRET_KEY` (live) in Vercel | 2 | ☐ |
| Beide `NEXT_PUBLIC_STRIPE_PRICE_ID_*` in Vercel | 2 | ☐ |
| Webhook-Endpoint `/api/webhook` mit Events | 2 | ☐ |
| Webhook-Endpoint `/api/webhooks/stripe` mit Events | 2 | ☐ |
| Webhook-Endpoint `/api/stripe/webhook` mit Events | 2 | ☐ |
| `STRIPE_WEBHOOK_SECRET`(s) in Vercel | 2 | ☐ |
| Customer-Portal + Branding konfiguriert | 2 | ☐ |
| Tax-Settings (DE / EU-OSS) | 2 | ☐ |
| Bestandskunden-Strategie entschieden (S2 default) | 2 | ☐ |
| 1 € Live-Test mit Refund | 2/3 | ☐ |
| Alter Stripe-Account: Webhooks disabled | 3 | ☐ |
| Alter Stripe-Account: 10 J. archivieren (HGB) | 4 | ☐ |

### 7.6 OpenAI

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Org auf `team@markmate.de` | 2 | ☐ |
| Markmate-Karte, $50–100 Prepaid → Tier 2 | 2 | ☐ |
| Neuer API-Key generiert | 2 | ☐ |
| `OPENAI_API_KEY` in Vercel (neu) | 2 | ☐ |
| Spending-Limit + Usage-Alert | 2 | ☐ |
| Test-Call gegen `/api/grade` auf Preview | 2 | ☐ |
| Alte private/gannaca-Keys revoked | 3/4 | ☐ |

### 7.7 Google Gemini

| Schritt | Phase | Status |
|---------|-------|--------|
| GCP-Projekt unter Markmate-Workspace | 2 | ☐ |
| Vertex AI / AI Studio aktiviert | 2 | ☐ |
| Markmate-Billing | 2 | ☐ |
| API-Key (oder Service-Account-JSON) generiert | 2 | ☐ |
| `GOOGLE_AI_KEY` in Vercel | 2 | ☐ |
| Test-Call gegen `/api/extract` | 2 | ☐ |
| Alte Keys revoked | 3/4 | ☐ |

### 7.8 Domain `korrekturpilot.de`

| Schritt | Phase | Status |
|---------|-------|--------|
| DNS-Zone exportiert (Zonefile) | 0 | ☐ |
| Bei gannaca-Registrar: Whois-Unlock + AuthCode | 2 | ☐ |
| Markmate-Registrar Account + Transfer-In | 2 | ☐ |
| Bestätigungs-Mail beantwortet | 2 | ☐ |
| Transfer 5–7 Tage Wartezeit | 2 | ☐ |
| DNS-Records am Markmate-Registrar repliziert | 2 | ☐ |
| TTL aller Records auf 300s | 2 | ☐ |
| A-Record / CNAME `@` auf neue Vercel-Adresse (Cut-Over-Tag) | 3 | ☐ |
| TTL zurück auf 3600s nach Cut-Over | 4 | ☐ |

### 7.9 Google Workspace

| Schritt | Phase | Status |
|---------|-------|--------|
| Markmate-Workspace auf `markmate.de` | 2 | ☐ |
| `team@markmate.de` + Funktions-Aliasse | 2 | ☐ |
| Aliasdomain `korrekturpilot.de` (nach Domain-Transfer) | 2 | ☐ |
| Postfächer migriert (Workspace Migration Tool) | 2 | ☐ |
| MX/SPF/DKIM/DMARC auf Markmate-Workspace | 3 | ☐ |
| Test: Mail an `support@korrekturpilot.de` | 3 | ☐ |
| SMTP-User/Pass in Vercel-ENV | 2 | ☐ |
| Alte gannaca-Workspace nach 30 Tagen Aliasdomain entfernen | 4 | ☐ |

---

## §8 — Gesamt-Zeitschätzung

### 8.1 Aufgeschlüsselt

| Kategorie | Min | Max | Bemerkung |
|-----------|-----|-----|-----------|
| **[M] Mel-Solo gesamt** (Phasen 0+2+3+4) | 16 h | 28 h | über 8–14 Wochen verteilt |
| **[CW] Co-Working Mel + Christopher** | 9 h | 13 h | 4–5 Sessions à 1.5–3 h |
| **[MM] Markmate ohne Mel** | 4 h | 8 h Arbeit | + 4–10 Wochen Wartezeit (GmbH-Gründung, Bankkonto, KYC) |
| **[W] Reine Wartezeit** | 4 Wochen | 10 Wochen | dominiert durch Phase 1 |
| **Cut-Over-Tag** | 2.5 h | 4 h | davon ≥ 1 h Christopher dabei |

### 8.2 Kalendarisch

| Szenario | Dauer ab Start |
|----------|----------------|
| **Best case** (GmbH-Gründung in 4 Wochen, KYC sofort, alles glatt) | **8 Wochen** |
| **Realistisch** | **10–12 Wochen** |
| **Worst case** (GmbH-Eintrag dauert, KYC-Rückfragen, Stripe-Support nötig) | **14–18 Wochen** |

### 8.3 Christopher-Zeit isoliert

Damit Christopher Termine blocken kann:

| Session | Dauer | Inhalt |
|---------|-------|--------|
| Session 0 (Phase 0) | ~2 h | Vault, gmail-Zugang, Markmate-Domain reservieren, Mel-Keys rotieren |
| Session 1 (Phase 2, nach Bankkarte) | 2–3 h | Workspace, GitHub-Org, Supabase-Org, Vercel-Team, Registrar |
| Session 2 (Phase 2) | 2–3 h | OpenAI, Gemini, Stripe-Anlage + KYC, Repo-Transfer |
| Session 3 (Phase 2, nach KYC) | 1–2 h | Stripe-Webhooks, Stripe-Test, Domain-Transfer einleiten |
| Session 4 (Cut-Over-Tag) | 1–2 h | Live-Switch, Stripe-Live-Test |
| **Summe** | **8–12 h** | über 10–12 Wochen verteilt |

---

## §9 — Definition of Done

Migration abgeschlossen, wenn:

1. `korrekturpilot.de` löst auf neue (Markmate-Vercel) IP auf, weltweit propagiert.
2. Test-User-Login mit altem Passwort funktioniert.
3. End-to-End-Test (Upload → Korrektur → PDF-Export) auf neuer Infra grün.
4. Stripe-Live-Checkout erzeugt Customer + Webhook + Credits.
5. Support-Mail an `support@korrekturpilot.de` kommt an.
6. Impressum / AGB / DP nennen Markmate GmbH.
7. Alle 9 Markmate-Accounts (GitHub, Vercel, Supabase, Stripe, OpenAI, Gemini, Registrar, Workspace, Vault) gehören Markmate, gannaca-Karte überall ersetzt.
8. Mel ist aus keinem Markmate-Account mehr als Admin (nach 30 Tagen).
9. Alte gannaca-Systeme paused (nicht deleted) — 30-Tage-Rollback-Anker.
10. Übernahme-Vereinbarung gannaca ↔ Markmate unterzeichnet, Steuerberater eingebunden.
11. Christopher hat Vault + nicht-techn. Übergabe-Doku + Notfall-Runbook.
