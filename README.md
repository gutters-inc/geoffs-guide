# Geoffs Guide

Public, mobile-only Flemington Oaks Day guide for 5 November 2026. Preserve the existing Site ID, public audience, original user portrait bytes and 520px maximum reading column. The published experience is deliberately read-only: **Form, Late mail, Tips, Ladder**. The race picker is the only selection control. Do not reintroduce sliders, factor checkboxes, guide preferences, photo uploads, odds/price calculators or editable model settings into the public interface.

## Public experience

- **Form:** original shortlist, a compact published-support summary per runner, runner details and a collapsed full field. Late scratchings are flagged without rewriting the original order.
- **Late mail:** saved original/revised comparison, track and runner changes, optional gear/source details and official results. No shared revision is computed on a visitor’s device. Missing evidence withholds a firm revised tip. The homepage stamp is the actual saved-edition update time.
- **Tips:** source-attributed first picks, one concise reason, and collapsed track/run assumptions, alternatives and quotes. No preference selector or trust/pinning/filter system.
- **Ladder:** original form order, a short explanation between neighbours and expandable race evidence. No parameter or two-horse comparison selectors.

Public code ignores old browser factor preferences. Race history and the original order remain immutable across tab changes and saved updates. Only the source data’s existing runner status/jockey and advertised time can refresh from a saved edition. Dates and source links remain visible; repeated and technical explanations live behind disclosures.

## Managed factors

Edit **`config/factors.json`** to manage shared revision policy; there is no public tuning panel. The build validates and embeds it server-side. Defaults: 21-day recent-evidence half-life, reported going with 70% matching-ground preference, at least three comparable earlier official races for the gate signal (cap 0.35L), and a Low crowd tie-breaker (max 0.05 raw units). Published tips also decay with a two-day half-life, unknown dates get half weight and future dates are excluded. Shared ownership/outlet groups share a vote. Missing connected form gets no crowd bonus. These heuristics are not calibrated probabilities; no gear or jockey win-count performance bonus is invented.

The original guide always retains its unadjusted 45-day evidence half-life. Form and Ladder are original-history views. Late mail is the separate server-prepared revision.

## Source and deployment

UI sources and assets are in `dist/`; `worker/live.mjs` fetches the fixed TABtouch meeting and Open-Meteo. `worker/late-mail.mjs` builds and stores dated revisions. `scripts/build.mjs` embeds the UI bytes, pure model, live-result aggregation and managed factors into `dist/server/index.js`.

`.openai/hosting.json` retains project ID `appgprj_6aeac1e872f481918b4ac9e8ed852dd3` and the logical R2 binding `"r2": "BUCKET"`. Package its source manifest plus `dist/server/index.js` only; generated output is ignored. Keep secrets out of source. The Sites source helper is unavailable in this environment; the existing hidden-stdin Git/packaging helper preserves source provenance.

`collect.py` can refresh the **historical original** manually, but routine late-mail runs never replace it. Original historical starts exclude trials and future races. Silks use the original TABtouch sprites. Verified photos retain source credit; absent photos do not get a large empty public card. The original supplied Geoff portrait is unchanged.

## Saved updates and schedules

The two existing, enabled Site-linked automations split race checks to respect the once-per-hour limit per task:

- A: 12:50, 14:00, 15:10, 16:20, 17:40 AEDT.
- B: 13:25, 14:35, 15:45, 17:00, 18:10 AEDT (last slot is the results wrap).

These are one-day schedules on 5 November 2026. Preserve them when making UI changes. Creation proves scheduling, not execution or delivery. Each job uses the published `/late-mail-update-instructions.json`, `/late-mail-plan.json` and fixed-Site `/late-mail-updater.py`. A fresh worker obtains supported Site service access through `get_site`, sends it only to this Site in `OAI-Sites-Authorization` plus the standard `Authorization` header, and supplies credentials via hidden stdin, never command arguments, files or output. The protected writer verifies a SHA-256 digest against the hosted secret `LATE_MAIL_UPDATER_SHA256`. Do not rotate platform credentials to test access.

GET `/api/late-mail` reads R2. POST `/api/late-mail/refresh` refreshes all nine primary race pages, modelled weather and brief source-backed task notes, stores latest/per-slot snapshots and returns safe readback metadata. Slots are idempotent. Partial checks preserve old missing-race facts with their actual timestamps. Total failure retains the previous edition and does not move its saved-update timestamp. After a race starts, its last saved pre-race recommendation freezes; official winners attach without hindsight tips.

The browser reads the saved edition automatically, with a clearly dated packaged morning fallback, and never fetches racing/weather sources on the fly. Hosted Workers here cannot use `caches.default`; the forbidden-cache regression test prevents its reintroduction. R2 is the durable publication store. No OpenAI API-key-backed generator or bet-placement feature is active.

## Checks

`NODE_PATH=/tmp/oaks-qa/node_modules npm test` runs model, source-parser, durable writer and public interaction checks. `npm run build` validates factors and packages the Worker. `node scripts/check-sensitivity.cjs` writes the engineering sensitivity report. `scripts/seed-late-mail.mjs` prepares a packaged fallback from the independently checked local source pages.

The public UI suite covers all nine races across four tabs, all 149 runner sheets, no public factor controls, keyboard/deep links, source assumptions, immutable baseline and saved/fallback/missing/delayed editions. Managed rendered-browser QA remains unavailable because `cua_repl.js` is absent. Do not install a browser or invent an alternate preview route; report that visual limit honestly.

## Compact IG-inspired colour system

`dist/ig.css` is the single public stylesheet. It uses IG’s current red #E61E1E, charcoal #171717, white and cool grey #EDF0F2, verified against IG’s public CSS. Geoffs Guide keeps its own name, portrait and identity; no IG logo or affiliation claim is used. The former cover is condensed into a masthead; runner ranks and silks lead compact row cards. Source photos and credits are preserved. Public control removal, four-tab navigation, factor policy and background schedules are unchanged.
