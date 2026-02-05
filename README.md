# KindKlick — Child-Safe Browser Extension (Stage 0)

Local-first child-safe browsing assistant.

This README is the **single file** that documents what we completed in **Stage 0**.

## Stage 0 — Done (deliverables)

### MVP features completed

- Website blocking (domain-based)
  - Category-based domain lists (placeholder dataset for now)
  - Custom allow list override
  - Custom block list
- SafeSearch enforcement (search platforms)
  - Google: forces `safe=active`
  - Bing: forces `adlt=strict`
  - YouTube Restricted Mode: **not implemented yet** (placeholder)
- Profiles (age modes)
  - Kids / Pre-teen / Teen selection (UI + stored setting)
- Parent control with PIN
  - PIN is stored as a **SHA-256 hash** (local-first)
  - Options changes require PIN once a PIN is set
- Block page with explanation + request access
  - Block page shows “Blocked because …” + domain + category
  - “Request access” stores a request locally for parent review
  - Parent can approve: **10 minutes / 1 hour / always**

### Non-functional basics completed

- Local-first storage (no server)
- Explainable blocking (reason + category)
- Basic cleanup of expired approvals (periodic)

## Where each Stage 0 feature lives (file map)

### Extension entry points

- `manifest.json` — MV3 manifest, permissions, service worker, pages
- `src/background/service_worker.js` — navigation interception + redirect-to-block + message handler

### Filtering / decisions

- `src/shared/engine.js`
  - `evaluateUrl(url, settings)` — allow/block decision (priority: approvals > allowlist > custom blocklist > categories)
  - `enforceSafeSearchIfNeeded(url, settings)` — SafeSearch redirects (Google/Bing)
- `src/shared/url.js`
  - `extractDomain(url)` — domain normalization used by the engine

### Storage (local-first)

- `src/shared/storage.js`
  - `defaultSettings()` — initial settings + placeholder category lists
  - `getSettings()` / `setSettings()` — read/write settings
  - `setPinHash()` + `verifyPin()` — parent PIN hashing + verification
  - `recordAccessRequest()` — request access queue
  - `upsertApproval()` / `clearExpiredApprovals()` — temporary + permanent approvals

### Parent dashboard (Options)

- `src/options/options.html` — parent controls UI
- `src/options/options.js` — load/save settings, PIN prompt gating, approvals buttons
- `src/options/options.css` — styling

### Child UX (Block page)

- `src/blocked/blocked.html` — block screen
- `src/blocked/blocked.js` — request access button calls background
- `src/blocked/blocked.css` — styling

### Quick UI (Popup)

- `src/popup/popup.html` — simple status view
- `src/popup/popup.js` — reads settings and opens Options
- `src/popup/popup.css` — styling

## Load in Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `KindKlick`

Open **Details → Extension options** to configure.

## Notes / limitations (stage 0)

- Blocking is done by watching navigations and redirecting the tab to the block page.
- YouTube Restricted Mode enforcement is a placeholder in this stage.
- No data is sent to any server (local-only storage).

## Quick demo script (stage 0)

1. Load extension unpacked.
2. Open Options → set a Parent PIN.
3. Add any domain to “Always block” (or use placeholder like `example-adult.test`).
4. Visit the domain → see the block page with explanation.
5. Click “Request access”.
6. Go to Options → approve for 10 minutes → try again.

## Next steps

- Replace placeholder domain lists with real datasets
- Add time limits + schedules
- Harden anti-bypass (proxy list, cached/translate proxies)
- Improve reporting (privacy-first weekly stats)
