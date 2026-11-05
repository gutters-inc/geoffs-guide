# Oaks Day Form Connections

Phone-first UI sources in `dist/`, with a self-contained Worker built by `npm run build`. The published data is a fixed pre-race snapshot of Flemington on 5 November 2026, sourced from TABtouch's nine race form pages. Historical starts remain a fixed snapshot. A separate live module refreshes reported going, existing-runner changes and official results. Prices are not displayed.

The client builds shared-race edges and weighted pairwise margin ratings locally. See the site's method panel for weighting, assumptions, coverage and limitations. Emergencies and scratchings do not enter the verdict. Unconnected groups receive an explicit comparison warning, and sparse or neutral leaders receive no reliable pick.

The Form & scenarios tab has contender cards with sourced photos, race-day silks, rating lanes and live scenario controls. A separate Connections tab contains a plain-language explanation, a real indirect-chain example, the network, chain inspector and historical head-to-head matrix. Runner details open in a shared native dialog without changing tabs. `dist/media.json` records photo attribution and sources; every listed runner has a TABtouch race-day silk sprite. Missing verified photos have explicit placeholders. User-selected photos are kept in memory only for that tab session.

Scenario settings are stored in browser localStorage. Ground and venue choices reweight historical evidence; handicap settings compare observed historical weights with the selected race's scenario weights, using a user-set 0–1 lengths/kg coefficient. Draw assumptions and per-horse extra lengths are explicit user opinions. The baseline and historical edges never change. These heuristics are not calibrated race probabilities. Reset clears all scenario settings, including runner overrides across the meeting.

## Validate

`npm install`, then `npm test`. These cover model invariants and interaction logic in a minimal DOM. They are not rendered browser or visual checks.

## Refresh data manually

Install Python `beautifulsoup4`, then run `python collect.py`. This retrieves all nine published form pages and writes `dist/data.json`. Cached raw pages are kept locally in ignored `raw/`; `python collect.py --cached` reparses the same snapshot and preserves its timestamp. Winner abbreviations are resolved only when their prefix uniquely matches a known full name. Trials and future starts are excluded. A winner's displayed winning margin is kept separately from its zero beaten margin.

Review new source fields, scratchings and data before republishing. The Worker checks TABtouch and Open-Meteo on demand. No scheduled updater or API key is required.

## UX and control feedback

Slider and numeric input events recalculate live, coalesced to animation frames. Edits preserve the focused input node. The impact dashboard reports the actual leader, rank changes, biggest gain/drop against baseline, and the effect of the current edit relative to its starting point. Invalid values keep the last valid model input and show an inline error. Disabled controls explain their dependency. A matching-ground strength of 0 restores baseline influence and 100% removes other-ground observations. A zero-observation warning prevents interpreting weaker evidence as proven suitability.

The focused form chart uses a labelled field-specific scale by default; the full 0–100 scale remains available. It changes the presentation only. Ratings are not amplified to create visual movement. The two page tabs have proper tab/panel semantics and arrow-key navigation. Direct URLs use `#race-8/connections` (and equivalents for other races).

## Mobile-only product constraint

The user confirmed this guide is used only on mobile. Keep the phone layout at every viewport, with a 520px maximum reading column. `mobile.css` supplies safe-area-aware bottom tabs, a sticky native race picker, 48px touch targets, 16px input text, stacked ranking/adjustment cards and a bottom-sheet runner dialog. `mobile.js` provides readable connection and head-to-head lists; the wide map and full matrix are optional, locally scrollable details. Preserve this constraint in future changes.

## Current product: tips and form ladder

The user removed the price-based Value experience. Do not reintroduce odds inputs, fair-price math, win-chance estimates or ROI widgets. `tips.js` replaces `value.js`. The existing `/value` route and `valuePanel` identity now show **The tips** for link compatibility. Twelve distinct guide identities supply 69 published lead selections plus explicitly labelled alternatives/ordered selections. Same-author syndications are counted once. Reporter wording and quotations retain source/date attribution.

The tips page now shows all covering guides in source order, without a preference selector, pinning, trust buttons or filters. The page contains only tips, published support, reasoning, track/run assumptions and source notes; bookmaker promotions have been removed from this view. No-bet calls, scratchings, emergencies and missing coverage remain separate. Neds and TAB NZ shared ownership is disclosed; guide counts are not independent votes or win probabilities.

The graph and head-to-head matrix have been removed. `ladder.js` shows a vertical mobile **Form ladder**, six horses initially, with the rest expandable. Every adjacent pair has an explanation based on actual direct meetings, a common-rival path, contradictory results or missing connections. Direct reversals and disconnected groups are explicit. A two-link margin comparison is a clue from different races, never a predicted winning margin. Scenario controls update the ladder. A collapsed two-horse inspector retains original race evidence for further checking.

The user’s supplied screenshot remains byte-for-byte as `assets/geoff-source.jpg`; CSS crops the original portrait. Branding and the existing public URL remain Geoffs Guide. Mobile-only is a continuing constraint. No direct Grok access or relevant verified X post was available; published guide quotations are not presented as social posts.

## Live conditions module

`worker/live.mjs` is the fixed-source server integration; it exposes GET `/api/meeting` (nine fixed Flemington 5 November 2026 races) and `/api/weather` (Open-Meteo near Flemington). It is not an open proxy. Racing responses cache for 90 seconds (partial responses 30 seconds), weather for 10 minutes. Per-request upstream timeouts are 15 seconds, with three concurrent race fetches. No credentials or visitor location are used. Open-Meteo modelled weather is attributed under CC BY 4.0 and does not determine reported track going.

`live-model.js` contains pure same-day aggregation. `live.js` refreshes on opening, every three minutes while visible and when the tab returns; it labels failures and last checks. Fresh, recognised race-specific going can automatically reweight historical form. Ground edits and reset switch to manual mode; preferences remain local to the browser. Existing-runner scratchings, jockey, weight and barrier can update, but emergencies are not automatically promoted without a confirmed final field. Historic starts, graph edges and published tip selections are never rewritten.

Official results require both a published placing and “Dividends official” in the race page; provisional results do not influence learning. Earlier official jockey wins/rides (fractional wins for dead heats) are context only. Optional gate learning requires at least three earlier official races on matching going and the same straight (up to 1200m) or turning course. It compares inside-half winner share with inside-half starter share per race, sums excess, divides by sample count + 8, and caps the resulting edge at 0.35 lengths at each end. This is explicitly an uncalibrated gate heuristic, not actual racing-lane bias or a probability. It is off by default. Manual draw edits disable learning. No later race may inform an earlier one. Ground-specific runner records use the recent source starts and are descriptive, not calibrated suitability measures.

Build embeds all UI/media bytes into `dist/server/index.js`; production uses the Worker manifest (no `static` field). Generated server and copied manifest are ignored. Package `.openai/hosting.json` plus `dist/server/index.js` only. The public Site identity and URL are preserved. `npm test` covers model, parser, live aggregation and integrated DOM interactions. Rendered mobile browser QA remains unavailable because the prescribed managed browser helper is absent.

## Separate original form and Race-day views

The four mobile tabs are Form, Race-day, The tips and Form ladder. `/race-day` hash routes to the adjustments view. Form is a simple immutable original snapshot: `originalData` is deep-copied before live runner updates, and baseline ratings are always calculated from that original race. Baseline cards, verdict, rankings and baseline runner sheets do not use scenario settings or live context. Live updates can change the editable/current data and `ranked`, but never overwrite the benchmark. The shared race facts label snapshot vs live going explicitly.

Race-day owns the conditions/results module, all controls, impact feedback, rank movements and original/adjusted chart. `race-day.js` renders three adjusted leaders with full-field expansion, old/new ranks, rating deltas, exclusions and reasons; the sticky summary lets a mobile user see movement while adjusting. Missing connected form or zero usable starts under a strict matching-ground setting are labelled insufficient, with no average rating displayed. Missing weather/track feeds use one compact pending message; empty metric cards, unavailable follow-track switches and premature learning switches are hidden. Live checks start when Race-day is opened and poll only while that tab is visible. Open-Meteo's documented CORS weather endpoint is a browser fallback when the server weather endpoint is unavailable. No feed-driven change is invented from a missing feed.

## Selection controls and crowd support

All main adjustment sliders are replaced by native selection boxes and checkboxes. Ground strength, draw advantage and weight sensitivity use labelled choices, preserving a previous precise saved/automatic value as an extra option when necessary. Manual ground and draw selections disable their corresponding automatic mode.

The optional **Wisdom of the crowd** checkbox belongs in Race-day, not the tips page. It starts off and resets off. Low/Standard/Strong set a maximum 0.25/0.50/0.75-length unanimous-support boost. Users can include/exclude covering guides with checkboxes; no guide has an assumed track record advantage. `FormModel.crowd` deduplicates guide IDs, ignores no-bet/missing/ineligible picks, and gives each listed group one vote split equally among its included eligible guide identities. A horse gets maximum × its group-adjusted vote share. `scenarioWithCrowd` supplies derived bonuses to adjusted rating calls only; the original benchmark never receives them. No connected form means no applied crowd bonus. Movement reasons name supporters and the actual boost. Source data remains the dated editorial snapshot, not an invented latest feed. No AI/API integration or unattended bet generator has been activated.

## Evidence-first sensitivity rebalance

`node scripts/check-sensitivity.cjs` writes `reports/sensitivity.json` for all nine race fields. It isolates each control’s maximum absolute rating-point impact, measuring incremental crowd movement after recent-form weighting. These are sensitivity checks, not a validation of betting accuracy.

The immutable original benchmark retains 45-day historical-evidence decay. Race-day now recommends `preferRecent: true`, with a 21-day half-life; its checkbox can restore the original decay. Reset restores recommended settings, including following fresh reported going, rather than claiming to restore the original order. Published tips are limited to a 0.05 / 0.10 / 0.15 raw-unit boost for Low / Standard / High and have a two-day age half-life using their race-specific publication date where available. Unknown dates receive half weight; future dates are excluded. Previous saved influence choices migrate to the new one-fifth scale. Group discounting and no-form exclusions remain. Because boosts are positive and at most 0.15, they cannot reverse an evidence-led raw gap greater than 0.15; they only break close calls.

Fresh reported going changes historical-ground weights when following that feed. Modelled rain is context, never a fabricated surface rating. Earlier official results affect the optional comparable-course gate signal (up to 0.35L), while jockey win counts remain descriptive. A neutral or weak measured result is not amplified merely to make it exceed tip support. No missing/weather-only/result-provisional feed creates an adjustment. The form, conditions and same-day gates are heuristic evidence, not calibrated probabilities.

## Saved Late mail and unattended checks

Late mail is a server-prepared edition displayed in Race-day, with a Last updated stamp on the Form homepage. `worker/late-mail.mjs` persists latest and per-slot snapshots in the declared R2 BUCKET; browser reads do not fetch racing sources or rerun the shared recommendation. The background writer refreshes all nine TABtouch pages plus Open-Meteo, parses exact gear declarations and current guide selections, compares runner/track facts with the original snapshot and records source check times. Date-specific sourced research notes can be added by the authorised background task. Published times remain separate from check times. The original source clock is Perth (+08); the saved plan converts each jump minus ten minutes to Australia/Melbourne (AEDT, +11).

The published `/late-mail-update-instructions.json` is the saved, credential-free runbook. `/late-mail-updater.py` is a fixed-Site client accepting a token and payload only through hidden stdin; it prints safe write/readback metadata. A future task obtains supported service access afresh through Sites get_site, sends that credential only to this Site via OAI-Sites-Authorization and the standard Authorization header, and never exposes or persists it. The update route independently hashes the bearer and compares it to the configured secret `LATE_MAIL_UPDATER_SHA256`. Public reads cannot submit updates. Rotating the platform credential requires the owner to update the configured verifier; do not rotate for a check.

POST `/api/late-mail/refresh` accepts one scheduled-slot `runKey` and up to 30 short, allowlisted, source-attributed notes. Successful slots are idempotent. A partial race check retains older facts for missing races with their original timestamps; a total source failure retains the previous edition and records a failed attempt without moving its update timestamp. Shared revisions use 21-day recent form, the reported ground, qualifying earlier official gate evidence and only a Low (0.05) age-discounted published-tip tie-breaker. Gear and rider notices receive no invented bonus. After a race starts, its last pre-race revision freezes while official results are attached; no hindsight pick is created.

The old caches.default call caused hosted live routes to throw: this hosting runtime denies the default cache. It has been removed, with a regression test using a forbidden-cache getter. R2 is the durable publication store. The browser reads saved editions, with a clearly dated packaged morning edition fallback, and no background racing fetch tied to a visitor opening the page. Model and UI tests cover the new write/read workflow and original-form preservation.
