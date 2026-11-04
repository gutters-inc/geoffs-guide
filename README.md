# Oaks Day Form Connections

Buildless static site in `dist/`. The published data is a fixed pre-race snapshot of Flemington on 5 November 2026, sourced from TABtouch's nine race form pages. It is not a live field or odds feed.

The client builds shared-race edges and weighted pairwise margin ratings locally. See the site's method panel for weighting, assumptions, coverage and limitations. Emergencies and scratchings do not enter the verdict. Unconnected groups receive an explicit comparison warning, and sparse or neutral leaders receive no reliable pick.

## Validate

`npm install`, then `npm test`. These cover model invariants and interaction logic in a minimal DOM. They are not rendered browser or visual checks.

## Refresh data manually

Install Python `beautifulsoup4`, then run `python collect.py`. This retrieves all nine published form pages and writes `dist/data.json`. Cached raw pages are kept locally in ignored `raw/`; `python collect.py --cached` reparses the same snapshot and preserves its timestamp. Winner abbreviations are resolved only when their prefix uniquely matches a known full name. Trials and future starts are excluded. A winner's displayed winning margin is kept separately from its zero beaten margin.

Review new source fields, scratchings and data before republishing. There is no scheduled updater or API dependency in production.
