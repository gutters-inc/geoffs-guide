# Oaks Day Form Connections

Buildless static site in `dist/`. The published data is a fixed pre-race snapshot of Flemington on 5 November 2026, sourced from TABtouch's nine race form pages. It is not a live field or odds feed.

The client builds shared-race edges and weighted pairwise margin ratings locally. See the site's method panel for weighting, assumptions, coverage and limitations. Emergencies and scratchings do not enter the verdict. Unconnected groups receive an explicit comparison warning, and sparse or neutral leaders receive no reliable pick.

The Form & scenarios tab has contender cards with sourced photos, race-day silks, rating lanes and live scenario controls. A separate Connections tab contains a plain-language explanation, a real indirect-chain example, the network, chain inspector and historical head-to-head matrix. Runner details open in a shared native dialog without changing tabs. `dist/media.json` records photo attribution and sources; every listed runner has a TABtouch race-day silk sprite. Missing verified photos have explicit placeholders. User-selected photos are kept in memory only for that tab session.

Scenario settings are stored in browser localStorage. Ground and venue choices reweight historical evidence; handicap settings compare observed historical weights with the selected race's scenario weights, using a user-set 0–1 lengths/kg coefficient. Draw assumptions and per-horse extra lengths are explicit user opinions. The baseline and historical edges never change. These heuristics are not calibrated race probabilities. Reset clears all scenario settings, including runner overrides across the meeting.

## Validate

`npm install`, then `npm test`. These cover model invariants and interaction logic in a minimal DOM. They are not rendered browser or visual checks.

## Refresh data manually

Install Python `beautifulsoup4`, then run `python collect.py`. This retrieves all nine published form pages and writes `dist/data.json`. Cached raw pages are kept locally in ignored `raw/`; `python collect.py --cached` reparses the same snapshot and preserves its timestamp. Winner abbreviations are resolved only when their prefix uniquely matches a known full name. Trials and future starts are excluded. A winner's displayed winning margin is kept separately from its zero beaten margin.

Review new source fields, scratchings and data before republishing. There is no scheduled updater or API dependency in production.

## UX and control feedback

Slider and numeric input events recalculate live, coalesced to animation frames. Edits preserve the focused input node. The impact dashboard reports the actual leader, rank changes, biggest gain/drop against baseline, and the effect of the current edit relative to its starting point. Invalid values keep the last valid model input and show an inline error. Disabled controls explain their dependency. A matching-ground strength of 0 restores baseline influence and 100% removes other-ground observations. A zero-observation warning prevents interpreting weaker evidence as proven suitability.

The focused form chart uses a labelled field-specific scale by default; the full 0–100 scale remains available. It changes the presentation only. Ratings are not amplified to create visual movement. The two page tabs have proper tab/panel semantics and arrow-key navigation. Direct URLs use `#race-8/connections` (and equivalents for other races).

## Mobile-only product constraint

The user confirmed this guide is used only on mobile. Keep the phone layout at every viewport, with a 520px maximum reading column. `mobile.css` supplies safe-area-aware bottom tabs, a sticky native race picker, 48px touch targets, 16px input text, stacked ranking/adjustment cards and a bottom-sheet runner dialog. `mobile.js` provides readable connection and head-to-head lists; the wide map and full matrix are optional, locally scrollable details. Preserve this constraint in future changes.

## Current product: tips and form ladder

The user removed the price-based Value experience. Do not reintroduce odds inputs, fair-price math, win-chance estimates or ROI widgets. `tips.js` replaces `value.js`. The existing `/value` route and `valuePanel` identity now show **The tips** for link compatibility. Twelve distinct guide identities supply 69 published lead selections plus explicitly labelled alternatives/ordered selections. Same-author syndications are counted once. Reporter wording and quotations retain source/date attribution.

The user chooses one **go-to guide**. This preference is saved only in localStorage, pins that guide first, and can filter to their card. It never changes model ratings. No-bet calls, scratchings, emergencies and missing coverage are handled separately. Neds and TAB NZ shared ownership is disclosed; guide counts are not independent votes or win probabilities. Bookmaker features remain an optional collapsed reference with their earlier unconfirmed-coverage labels.

The graph and head-to-head matrix have been removed. `ladder.js` shows a vertical mobile **Form ladder**, six horses initially, with the rest expandable. Every adjacent pair has an explanation based on actual direct meetings, a common-rival path, contradictory results or missing connections. Direct reversals and disconnected groups are explicit. A two-link margin comparison is a clue from different races, never a predicted winning margin. Scenario controls update the ladder. A collapsed two-horse inspector retains original race evidence for further checking.

The user’s supplied screenshot remains byte-for-byte as `assets/geoff-source.jpg`; CSS crops the original portrait. Branding and the existing public URL remain Geoffs Guide. Mobile-only is a continuing constraint. No direct Grok access or relevant verified X post was available; published guide quotations are not presented as social posts.
