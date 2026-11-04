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
