# Receipt Tracker — Detailed Build Plan

## Context

You frequently fly for work and need to claim back out-of-pocket expenses (food, car
services, etc.) from the airline/company. Today that means juggling loose paper
receipts and manually figuring out what each one was for. You want an **Android app**
where you photograph a receipt, an AI reads it, the image is saved and **auto-renamed**
with the merchant/location and amount, you can **correct any AI mistakes**, and later
**pull receipts out in bulk** (ZIP of images, a PDF expense report, and a CSV) to submit
for reimbursement.

The intended outcome: open app → snap receipt → it's filed, named, and categorized in
seconds → at the end of a trip, export a clean package and email it to the company.

### Decisions locked in (from your answers)

- **Platform:** Android only.
- **AI engine:** Google **Gemini 2.5 Flash** as the default (best accuracy-per-dollar for
  vision/OCR — ~$0.30/1M in, $2.50/1M out, a fraction of a cent per receipt), with
  auto-escalation + one-tap manual re-run on **Gemini 3.1 Pro** for low-confidence/faded
  receipts. At your volume model cost is negligible, so this prioritizes accuracy.
  (Note: there is no "2.5 Pro" in the 2026 lineup; the Pro tier is **3.1 Pro**.)
- **Storage:** Backend + all data on your Linux deploy server (`/home/ubuntu/apps/...`).
- **Export:** Bulk ZIP, PDF expense report, and CSV.

### Tooling notes

- **Primary design tool: Stitch MCP** (AI UI generation). **Status: configured in
  `~/.claude.json`** as `Stitch` (`type: http`, `url: https://stitch.googleapis.com/mcp`,
  `X-Goog-Api-Key` header). MCP config loads on startup, so a **Claude Code restart** is
  required before its tools are callable. (The original config used the invalid
  `type: remote`, which silently failed to load — now fixed to `type: http`.)
- **Stitch is NOT the sole designer — its prompt is co-authored by every installed
  UI-design skill.** At design time, enumerate the installed UI-design skills and run the
  receipt-app design brief through each, then synthesize their outputs into ONE Stitch
  prompt (see Design Process). Currently installed: **`frontend-design`** (Anthropic
  official UI/UX skill), with **`superpowers:brainstorming`** for intent-shaping. The
  process must pick up **any additional design skills installed before the build starts** —
  do not hardcode the list; re-enumerate at build time.
- **Stitch + Gemini 3.1 Pro timeout behavior (IMPORTANT for whoever builds this):** Stitch
  generations run on **Gemini 3.1 Pro**, which **almost always returns a timeout error**.
  **A timeout does NOT mean failure.** The design nearly always still completes — just
  **wait ~2–3 minutes after the timeout**, then re-query/list and **download the generated
  design**. The agent must treat the timeout as "in progress", not "failed", and must not
  retry-spam or abandon the generation; poll/wait, then fetch the result.
- **Complementary tool: DesignSync MCP + `/design-sync` skill** — used to take the
  Stitch-generated screens, turn them into a reusable HTML component library, and sync to a
  claude.ai Design System project for visual review and iteration. Stitch generates;
  DesignSync curates/reviews.

---

## Architecture Overview

A **TypeScript monorepo** with three packages, so the phone app and server share types:

```
recipts/
├─ apps/
│  ├─ mobile/        # Expo (React Native) Android app
│  └─ server/        # Fastify + Prisma backend (runs on the deploy machine)
├─ packages/
│  └─ shared/        # Shared TS types + Zod schemas (Receipt, Trip, export DTOs)
└─ design/           # Stitch-generated screens → HTML component library for DesignSync
```

- **Mobile:** Expo + React Native + TypeScript. Distributed as a **sideloaded APK**
  (EAS Build or local Gradle) installed directly on your phone — no Play Store needed.
- **Backend:** Node.js + **Fastify** + TypeScript, **Prisma** ORM over **SQLite**
  (a single file — trivial to back up; can migrate to Postgres later if ever needed).
- **AI:** Backend calls Gemini via `@google/genai`; API key lives only on the server.
- **Image storage:** Files on the server filesystem; metadata rows in SQLite.
- **Auth:** Single-user. Long-lived device token + optional app PIN. Server sits behind
  nginx with TLS (Let's Encrypt). Nothing public without the token.

### Why this stack

- One language end-to-end → shared `Receipt`/`Trip` types, less drift.
- Expo gives a first-class Android camera + offline storage with minimal native code.
- SQLite + filesystem is the simplest durable option for a personal, single-user app on
  one server, and makes server-side ZIP/PDF/CSV generation straightforward.

---

## Data Model (Prisma / SQLite)

**Receipt**

- `id`, `createdAt`, `capturedAt`
- `imagePath` (original), `thumbnailPath`
- `merchant`, `locationCity`, `locationAddress`
- `purchaseDate`, `currency`, `subtotal`, `tax`, `tip`, `total`
- `category` (enum: Food, CarService, Lodging, Airfare, Parking, Tolls, Supplies, Other)
- `paymentMethod`, `notes`
- `tripId` (nullable FK)
- `aiRaw` (JSON of Gemini's full structured response)
- `aiConfidence` (0–1), `aiModel`, `status` (PROCESSING | NEEDS_REVIEW | CONFIRMED | FAILED)
- `userEdited` (bool — true once you correct anything), `fileName` (derived, see below)

**Trip** — groups receipts for one work trip/flight

- `id`, `name` (e.g. "JFK→LHR June"), `startDate`, `endDate`, `notes`

**LineItem** (optional, for itemized receipts)

- `id`, `receiptId`, `description`, `amount`

**Setting** (key/value) — naming template, default currency, category list, escalation threshold.

---

## Core Feature Set

### 1. Capture

- In-app camera (expo-camera): single shot + "add another page" for multi-page receipts.
- Import from gallery.
- Optional auto-crop/deskew (later enhancement; ship without it first).
- **Offline-first queue:** capture works with no signal; images queue locally
  (expo-file-system + a local SQLite/AsyncStorage queue) and upload + process when online.

### 2. AI Extraction (Gemini)

- Backend endpoint `POST /receipts` accepts the image, stores it, and calls Gemini
  **2.5 Flash** with a strict JSON schema (structured output) extracting:
  merchant, location (city + address), date/time, currency, subtotal, tax, tip, total,
  payment method, suggested category, line items, and a **confidence** score.
- **Escalation:** if confidence < threshold (default 0.6) or total is missing, retry once
  with **Gemini 3.1 Pro** (the Pro tier — best for faded/handwritten/crumpled receipts).
  A manual "Re-run with Pro" button is always available. Record which model produced the
  final answer. Default/escalation models are configurable in Settings.
- Status flows PROCESSING → NEEDS_REVIEW (low confidence) or CONFIRMED (high confidence).

### 3. Auto-Rename

- Derived `fileName` from a **configurable template**, default:
  `YYYY-MM-DD_Merchant_Category_$Total.jpg`
  → e.g. `2026-06-14_Hertz_CarService_$84.20.jpg`.
- Sanitized for filesystem safety; collisions get a `-2` suffix.
- Filename **recomputes whenever you edit** a field, so corrections flow through to export.

### 4. Review & Correct (the "fix the AI" workflow — first-class)

- Receipt detail screen: image at top (pinch-zoom), editable fields below.
- Fields the AI filled show a subtle **confidence indicator**; low-confidence fields are
  highlighted so you know what to double-check.
- **"Re-run AI"** button (optionally forcing the stronger 2.5 Flash model).
- Editing sets `userEdited=true` and locks that field from future AI overwrites.
- Category is a quick-pick chip selector; merchant/location are free text with recent-value
  autocomplete.

### 5. Browse / Search / Organize

- Home list: thumbnails, merchant, amount, date, category chip, status badge.
- Filters: date range, category, trip, "needs review", search by merchant text.
- Group by **Trip**. Assign/move receipts between trips; create trips inline.
- Running totals per filter/trip (e.g. "Food: $212.40 across 9 receipts").

### 6. Export (send to the company)

Server-side generation, downloaded to the phone (Android Storage Access Framework / share sheet):

- **ZIP** — all selected receipt images, named via the template.
- **PDF expense report** — cover summary table (date, merchant, category, amount, total)
  - one page per receipt image. (PDFKit or Puppeteer on the server.)
- **CSV** — structured rows for any expense system.
- Export by **trip**, date range, or manual multi-select. Each export is logged so you know
  what you've already submitted.

### 7. Settings

- Naming template editor with live preview.
- Category list management, default currency, AI escalation threshold.
- Backup status; manual "export full backup" (DB + images tarball).

---

## API Surface (Fastify)

- `POST   /receipts` — upload image → store → kick off Gemini extraction (returns receipt id, status)
- `GET    /receipts` — list with filter/search query params
- `GET    /receipts/:id` — detail
- `PATCH  /receipts/:id` — save corrections (recomputes fileName)
- `POST   /receipts/:id/reprocess` — re-run AI (optional `?model=flash`)
- `DELETE /receipts/:id`
- `GET    /receipts/:id/image` — original; `/thumbnail`
- `POST   /trips`, `GET /trips`, `PATCH /trips/:id`
- `POST   /export` — body: selection + format(s) → returns ZIP/PDF/CSV (or a job id for large sets)
- `GET    /health`
- All routes behind bearer-token auth middleware.

---

## Design Process (how we'll actually design the UI)

Design is a distinct phase **before** heavy RN coding, so screens are settled first.
**Stitch generates the screens; DesignSync curates and reviews them.**

0. **Connect Stitch MCP first.** Restart Claude Code so the (now `type: http`) Stitch server
   loads, and confirm its tools are callable. If Stitch still can't connect, fall back to
   Claude-generated HTML mockups for steps 3–4 (the rest of the flow is unchanged).
1. **Design language pass.** Define palette (clean, trustworthy, finance-y — neutral
   surfaces + one accent for actions, clear green/amber/red for confidence/status),
   type scale, spacing, and component states. Captured as design tokens that constrain
   every step below.
2. **Author the Stitch prompt with ALL installed UI-design skills (Stitch is not the sole
   designer).** This is the key step:
   - **Enumerate installed UI-design skills at build time** (do not hardcode). Currently
     that's **`frontend-design`**, plus **`superpowers:brainstorming`** for intent — but
     include any design skill installed before the build starts.
   - **Run the design brief through each skill independently** (the receipt-app context +
     design tokens + screen list), capturing each skill's recommendations — layout, IA,
     component patterns, accessibility, visual language.
   - **Synthesize the skill outputs into ONE consolidated Stitch prompt** per screen:
     reconcile conflicts, keep the strongest guidance from each, and encode the design
     tokens as hard constraints. These synthesized prompts are what we send to Stitch.
3. **Generate screens with Stitch (Gemini 3.1 Pro)** using the synthesized prompts — the key
   screens (Capture, Review/Correct, List, Trip detail, Export) and core components (Button,
   Field, ConfidenceBadge, ReceiptCard, StatusBadge, CategoryChip).
   - **⚠️ Timeout handling (do not skip):** Stitch runs on **Gemini 3.1 Pro and almost
     always returns a timeout error**. **This is NOT a failure.** The generation nearly
     always still completes. **Wait ~2–3 minutes after the timeout**, then re-query / list /
     poll for the result and **download the finished design**. Never treat the timeout as a
     dead end, and don't retry-spam — wait, then fetch. Budget extra wall-clock per screen.
4. **Curate into a component library + review** with the **`/design-sync` skill + DesignSync
   MCP**: turn the downloaded Stitch output into static HTML/CSS components in `design/`,
   create a claude.ai Design System project, push components one at a time, review the
   rendered cards, iterate. (Each preview file carries a `@dsCard` marker so it shows up in
   the Design System pane.)
5. **Iterate** — refine via more Stitch generations (re-synthesizing prompts through the
   design skills as needed; same timeout rule) and/or DesignSync edits until you approve the
   look.
6. **Translate** the approved tokens + components into React Native components (a small
   `ui/` library in `apps/mobile`). The HTML system stays as the living spec.

This gives you a reviewable, screenshot-able design before we commit to native code, and a
reusable component library on both sides.

---

## Build Phases (execution order)

1. **Scaffold** — Rename the root directory to a creative app name for this project , monorepo, `shared` types/Zod schemas, Fastify skeleton, Prisma schema +
   SQLite migration, Expo app skeleton, auth token plumbing. Verify `/health` + a stub
   list screen talking to the server.
2. **Design phase** — synthesize a Stitch prompt from all installed UI-design skills,
   generate screens with Stitch (honoring the 2–3 min wait-after-timeout rule), curate via
   DesignSync, lock the screens.
3. **Capture + upload + storage** — camera, image upload, server stores file + thumbnail,
   receipt row created in PROCESSING. Offline queue.
4. **Gemini extraction + auto-rename** — structured-output prompt, escalation logic,
   confidence, fileName derivation.
5. **Review & correct** — detail screen, editable fields, confidence UI, re-run AI.
6. **Browse / search / trips** — list, filters, trip grouping, totals.
7. **Export** — ZIP, PDF report, CSV; export logging.
8. **Settings + polish** — naming template editor, categories, backups.
9. **Deploy** — see below.

---

## Deployment Phase

The app is deployed from a **separate deploy machine**. Deployment roles/instructions live
at **`/home/ubuntu/apps/DEPLOYMENT.md`** on that machine — **read that file first during
the deploy phase** and follow its conventions for where apps live, process management,
reverse proxy, and TLS. The plan's deploy steps must conform to whatever
`/home/ubuntu/apps/DEPLOYMENT.md` specifies.

Backend deployment outline (to reconcile with `DEPLOYMENT.md`):

- App directory under `/home/ubuntu/apps/recipts` (server build + data dir for images +
  SQLite file).
- Process management per `DEPLOYMENT.md` (e.g. systemd unit or pm2), env file holding the
  `GEMINI_API_KEY` and the device auth token.
- nginx reverse proxy + Let's Encrypt TLS in front of the Fastify port.
- Backup cron: nightly tarball of the images dir + SQLite file.
- Mobile: build the **Android APK** (EAS or local Gradle), point it at the deployed HTTPS
  URL, sideload onto your phone.

---

## Verification

- **Backend:** unit tests for fileName derivation, export builders (ZIP/PDF/CSV), and the
  Gemini-response → Receipt mapping (with a fixture image + mocked Gemini call). Run
  `GET /health` and an end-to-end `POST /receipts` with a sample receipt image, confirm a
  CONFIRMED/NEEDS_REVIEW row and a correctly named file appear.
- **AI accuracy spot-check:** run ~10 real receipt photos (food + car service), confirm
  merchant/total/category extraction and that low-confidence ones land in NEEDS_REVIEW.
- **Correction flow:** edit a field, confirm fileName + export reflect the change and the
  field is locked from re-runs.
- **Export:** select a trip, generate ZIP + PDF + CSV, open each on the phone and confirm
  images are correctly named and totals match.
- **Offline:** enable airplane mode, capture 2 receipts, re-enable network, confirm they
  upload and process.
- **Deploy smoke test:** after deploying per `/home/ubuntu/apps/DEPLOYMENT.md`, hit the
  HTTPS health endpoint and do one full capture→export from the installed APK.

## Open items to confirm during build (non-blocking)

- **Stitch MCP:** config fixed (`type: http`) — **restart Claude Code** before the design
  phase and confirm its tools load. Remember the 2–3 min wait-after-timeout behavior above.
- **Install any other UI-design skills** you want contributing to the Stitch prompt _before_
  starting the build (the design phase enumerates installed design skills at build time).
- Exact Gemini model availability/quota on your Google AI key (confirm 2.5 Flash + 3.1 Pro).
- Whether you want optional auto-crop/deskew in v1 or deferred.
- PDF report layout preferences (one receipt per page vs. grid).

---

## Sources

- [Google Gemini API Pricing June 2026 (Rogue Marketing)](https://the-rogue-marketing.github.io/google-gemini-api-pricing-may-2026/)
- [Gemini API Pricing 2026 — all models (metacto)](https://www.metacto.com/blogs/the-true-cost-of-google-gemini-a-guide-to-api-pricing-and-integration)
- [Google Gemini API Pricing 2026 (opslyft)](https://www.opslyft.com/blog/google-gemini-api-pricing-2026)
