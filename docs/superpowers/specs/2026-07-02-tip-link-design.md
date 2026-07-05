# Tip Link — Design

## Purpose
Give users a way to voluntarily support development of Tab Snapshot, without adding
any backend, accounts, or payment processing to the extension itself.

## Approach
Add a small, unobtrusive footer link in the popup that opens a Ko-fi tip page
(`https://ko-fi.com/janko765`) in a new browser tab.

## Details

- **Placement:** Bottom of `popup.html`, below the session list (and search box,
  when visible). Rendered as a persistent footer, not a modal or banner.
- **Label:** "☕ Support this extension"
- **Styling:** Small, muted/secondary text in `popup.css`, consistent with light
  and dark themes. Visually subordinate to Save/Restore/Update actions.
- **Behavior:** On click, calls `chrome.tabs.create({ url: 'https://ko-fi.com/janko765' })`
  and closes the popup — the same pattern already used elsewhere in `popup.js` to
  open tabs. Requires no new permissions (`tabs` is already granted).
- **No tracking:** No click analytics, no nagging banners, no repeated prompts.
  Matches the existing "no accounts, no servers, no external requests [beyond what
  the user initiates]" philosophy.

## Out of scope
- In-extension payment processing.
- Any tip platform other than Ko-fi.
- Tracking/analytics of tip link clicks.
- Dismissible banners or nudges.

## Docs
Add a one-line mention under Features in `README.md`.
