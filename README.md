# Geoffs Guide

Public, mobile-only Flemington Stakes Day guide for 7 November 2026. Preserve the existing Site ID, public audience, original user portrait bytes and 520px maximum reading column. The published experience is deliberately read-only: **Form, Late mail, Tips, Ladder, Results**. The race picker is the only selection control. Do not reintroduce sliders, factor checkboxes, guide preferences, photo uploads, odds/price calculators or editable model settings into the public interface.

## Public experience

- **Form:** original shortlist, a compact published-support summary per runner, runner details and a collapsed full field. Late scratchings are flagged without rewriting the original order.
- **Late mail:** saved original/revised comparison, track and runner changes, optional gear/source details and official results. No shared revision is computed on a visitor’s device. Missing evidence withholds a firm revised tip. The homepage stamp is the actual saved-edition update time.
- **Tips:** source-attributed first picks, one concise reason, and collapsed track/run assumptions, alternatives and quotes. No preference selector or trust/pinning/filter system.
- **Ladder:** original form order, a short explanation between neighbours and expandable race evidence. No parameter or two-horse comparison selectors.

Public code ignores old browser factor preferences. Race history and the original order remain immutable across tab changes and saved updates. Only the source data’s existing runner status/jockey and advertised time can refresh from a saved edition. Dates and source links remain visible; repeated and technical explanations live behind disclosures.

## Managed factors

Edit **`config/factors.json`** to manage shared revision policy; there is no public tuning panel. The build validates and embeds it server-side. Defaults: 21-day recent-evidence half-life, reported going with 70% matching-ground preference, at least three comparable earlier official races for the gate signal (cap 0.35L), and a modest crowd tie-breaker (max 0.10 raw units). Published tips also decay with a two-day half-life, unknown dates get half weight and future dates are excluded. Shared ownership/outlet groups share a vote. Missing connected form gets no crowd bonus. These heuristics are not calibrated probabilities; no gear or jockey win-count performance bonus is invented.

The original guide always retains its unadjusted 45-day evidence half-life. Form and Ladder are original-history views. Late mail is the separate server-prepared revision.

## Source and deployment

UI sources and assets are in `dist/`; `worker/live.mjs` fetches the fixed TABtouch meeting and Open-Meteo. `worker/late-mail.mjs` builds and stores dated revisions. `scripts/build.mjs` embeds the UI bytes, pure model, live-result aggregation and managed factors into `dist/server/index.js`.

`.openai/hosting.json` retains project ID `appgprj_6aeac1e872f481918b4ac9e8ed852dd3` and the logical R2 binding `"r2": "BUCKET"`. Package its source manifest plus `dist/server/index.js` only; generated output is ignored. Keep secrets out of source. The Sites source helper is unavailable in this environment; the existing hidden-stdin Git/packaging helper preserves source provenance.

`collect.py` can refresh the **historical original** manually, but routine late-mail runs never replace it. Original historical starts exclude trials and future races. Silks use the original TABtouch sprites. Verified photos retain source credit; absent photos do not get a large empty public card. The original supplied Geoff portrait is unchanged.

## Saved updates and schedules

The two existing Site-linked A/B automations are reused for Stakes Day on 7 November, with at least an hour between runs within each task. The authoritative enabled state is returned by `/api/late-mail`; the published plan records the intended slots, not execution proof.

- A pre-race starts: 12:30, 13:40, 15:00, 16:20, 17:40 AEDT (races 1, 3, 5, 7, 9).
- B pre-race starts: 13:05, 14:20, 15:40, 17:00 AEDT (races 2, 4, 6, 8), plus the 18:10 final wrap.
- Each race run performs its pre-check, then keeps a bounded client watch alive for result checks near jump +3, +6, +10 and +20 minutes. It stops at official/abandoned; source cooldowns can postpone or suppress checks. Any watch ends within 45 minutes. A delayed race uses its verified revised time within that bound. The next pre-check also checks at most one older unresolved race; the final wrap fetches only unresolved races.

Each future job uses the published `/late-mail-update-instructions.json`, `/late-mail-plan.json` and fixed-Site `/late-mail-updater.py`. A fresh worker obtains supported Site service access through `get_site`, sends it only to this Site in `OAI-Sites-Authorization` plus the standard `Authorization` header, and supplies credentials via hidden stdin, never command arguments, files or output. The protected writer verifies a SHA-256 digest against the hosted secret `LATE_MAIL_UPDATER_SHA256`. Do not rotate platform credentials to test access.

GET `/api/late-mail` reads R2. POST `/api/late-mail/refresh` refreshes all nine primary race pages, modelled weather and brief source-backed task notes, stores latest/per-slot snapshots and returns safe readback metadata. Slots are idempotent. Partial checks preserve old missing-race facts with their actual timestamps. Total failure retains the previous edition and does not move its saved-update timestamp. After a race starts, its last saved pre-race recommendation freezes; official winners attach without hindsight tips.

The browser reads the saved edition automatically, with a clearly dated packaged morning fallback, and never fetches racing/weather sources on the fly. Hosted Workers here cannot use `caches.default`; the forbidden-cache regression test prevents its reintroduction. R2 is the durable publication store. No OpenAI API-key-backed generator or bet-placement feature is active.

## Checks

`NODE_PATH=/tmp/oaks-qa/node_modules npm test` runs model, source-parser, durable writer and public interaction checks. `npm run build` validates factors and packages the Worker. `node scripts/check-sensitivity.cjs` writes the engineering sensitivity report. `scripts/seed-late-mail.mjs` prepares a packaged fallback from the independently checked local source pages.

The public UI suite covers all nine races across five tabs, all 125 runner sheets, no public factor controls, keyboard/deep links, source assumptions, immutable baseline and saved/fallback/missing/delayed editions. Managed rendered-browser QA remains unavailable because `cua_repl.js` is absent. Do not install a browser or invent an alternate preview route; report that visual limit honestly.

## Compact IG-inspired colour system

`dist/ig.css` is the single public stylesheet. It uses IG’s current red #E61E1E, charcoal #171717, white and cool grey #EDF0F2, verified against IG’s public CSS. Geoffs Guide keeps its own name, portrait and identity; no IG logo or affiliation claim is used. The former cover is condensed into a masthead; runner ranks and silks lead compact row cards. Source photos and credits are preserved. Public control removal, five-tab navigation, factor policy and background schedules are unchanged.

## Stakes Day refresh and Oaks review

`config/meeting.json` names the current nine-race card. `collect.py --cached` parses checked pages from `raw/<meeting date>/` (ignored); without the flag it retrieves the exact meeting. Race times come from the source, converted from AWST to AEDT. The live writer, dated storage keys, client plan and source notes all target 7 November 2026. Never merge a previous meeting into a new one. `scripts/seed-late-mail.mjs` builds the fallback using the checked local pages. Silks were re-fetched for this card; horse photos are retained only against verified identities with credits.

The immutable Oaks data, final durable snapshot and original model live in `archive/oaks-2026/`. `node scripts/oaks-review.cjs` uses that original model to write `dist/lessons.json`: 3/9 original first picks won; 1/4 firm saved revised picks won; five revised tips were withheld. This is a descriptive audit of one meeting, not a backtest or evidence of improved predictive performance. Do not optimise coefficients to those nine results.

Stakes confidence checks the horse's **own** recent comparable starts, last-race age, reported-ground evidence and disconnected form groups, rather than relying on its network alone. Fewer than two own comparable starts in 90 days, a gap over 60 days, absent fresh live facts, missing matching-ground form, or separate groups caps confidence at Low. Moderate is reserved for supported form; no calibrated win percentages or High label is supplied. Current weights remain unchanged. Debutants/missing histories are unranked rather than represented by a neutral 50-point runner in the public ladder.

Runner details now include sourced career/course/distance/first-up/Soft/Heavy records, recent trials/jump-outs, and dated stewards context flags. These are contextual evidence, not automatic numeric bonuses. Saved Good/Soft/Heavy leaders are clearly hypothetical and retain confidence caveats. Curator forecasts and lane views are attributed opinions; only the racing source changes the reported going.

The tips edition contains nine named voices from TAB NZ, TABtouch, Just Horse Racing and SEN/RSN, 43 first selections, and a separate boxed quinella. SEN voices share one outlet group in the booster; reprinted columns and multi-leg selections do not create independent win tips. Missing publication dates and track/run assumptions stay labelled missing.

## Collaborating

Public repository: https://github.com/gutters-inc/geoffs-guide (`main`). The `github` remote is the collaboration repository; `origin` is the Sites source repository. GitHub pushes alone do not deploy the public Site. Keep both pushed to the same reviewed source commit when publishing.

Use Node 22+ and Python 3. Install the JS dev dependency with `npm install`; `npm test` runs the checks and `npm run build` packages the Worker. The collector additionally needs `beautifulsoup4`. A copy served from `dist/` can use the packaged saved fallback; production refreshes need the existing R2 binding and runtime writer secret, neither of which belongs in Git.

The newer Results tab, share cards, notification opt-in and official dividend parsing were retained during the Stakes refresh. The historical supplied-price return artwork is available only in `oaks-review.html`; it is never presented as a Stakes Day result. New Results scoreboards count only official races and distinguish firm revised picks from baseline fallbacks.

## Rate-limited event watches

`worker/polling.mjs` holds the shared policy. A conditional R2 write acquires a five-minute exclusive refresh lease, so separate Worker instances and overlapping jobs cannot stampede the source. An expired owner cannot release a newer lease; publication verifies ownership. Racing requests are spaced by at least three seconds, the same race cannot be fetched more than once in two minutes, full manual refreshes have a ten-minute minimum, and all callers share ceilings of 30 racing requests/hour and 90/day. Counts include failed attempts. Weather has a thirty-minute minimum and is skipped on post-result polls.

429 and transient failures stop the batch and persist exponential backoff with jitter, honouring longer Retry-After values. A source 403 opens a one-hour circuit. No browser, public `/api/meeting`, public `/api/weather`, or saved-edition read ever fetches upstream. Visitors read the shared edition approximately every 60–75 seconds while visible. Browser notifications are deduplicated per meeting/race, not per edition.

The stdlib-only `dist/late-mail-updater.py` watch receives access through hidden stdin, follows the saved jump, and sleeps in chunks of at most thirty seconds. It is not an unlimited daemon and never stores the credential. Each run may take around thirty minutes; task execution and delivery remain best-effort, not a timing guarantee. No finish-event webhook is supplied by this source.

Provisional placings appear in Late mail and Results as **INTERIM**, without payouts or celebration. They freeze the saved pre-race tip but do not enter track learning, jockey/trainer scoreboards or tipster accuracy. Only official reports count. A provisional/pending response cannot overwrite an earlier official result. Tips without a recent pre-jump check remain Low confidence.

`polling.test.mjs` covers twenty concurrent lease claims, per-race/host/budget limits, cooldown persistence, Retry-After, clock boundaries, terminal stops, interim freeze and public reads without upstream calls. The UI suite also checks interim labels and their exclusion from official results.
