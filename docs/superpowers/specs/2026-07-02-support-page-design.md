# "Support the project" Page — Design

## Purpose
Replace the single footer Ko-fi link with a proper pay-what-you-like support flow,
modeled on the classic pattern (e.g. Volume Master's support page) but with
**original copy** — no text reused from any other extension. The extension still
processes no payments itself; tier buttons open external payment links.

## Supersedes
The 2026-07-02 tip-link design. Its footer link is **removed** as part of this
work (markup in `popup.html`, `.support-footer`/`.support-link` rules in
`popup.css`, and the `supportLink` element lookup + click handler in `popup.js`).

## Entry point (popup)
- A heart icon button on the right side of the popup header (`.app-header`):
  title on the left, heart pushed to the far right via `margin-left: auto`.
- Styled like the existing quiet icon buttons (`.btn-icon`, same as the rename
  pencil), with an inline heart SVG, `title` and `aria-label` = "Support Tab Snapshot".
- Click → `chrome.tabs.create({ url: chrome.runtime.getURL("support.html") })`,
  then `window.close()`. Opening the extension's own page in a tab needs **no
  manifest changes** (`web_accessible_resources` is only for embedding by web pages).

## Support page — three new bundled files

### `support.html`
Centered single-column page (max-width ~640px):
1. **Header:** the same amber-tile SVG brand mark used in the popup + the name
   "Tab Snapshot".
2. **Intro (original copy, warm but concise):** states the extension is free
   forever; this is pay-what-you-like; explicitly says not paying is completely
   fine.
3. **Section "One-time payment":** three tier buttons — 😊 $5, 🚀 $10, ❤️ $25.
4. **Section "Monthly support":** three tier buttons — ⭐ $5/month, 🌟 $10/month,
   💎 $20/month. The middle ($10/month) is visually highlighted and carries a
   "Popular option" label beneath it.
5. **Footer note:** original phrasing of "ad-free and tracking-free — that's how
   it should be."

### `support.css`
- Standalone stylesheet. **Copies** the popup's design-token block (`:root`
  variables and the `prefers-color-scheme: dark` override) so the page matches
  the Slate & Amber identity in both light and dark mode.
- Does **not** link `popup.css` (it hardcodes `body { width: 360px }` and other
  popup-only rules).
- Page-specific layout: centered column, section headings, tier-button grid
  (3 per row), highlighted middle monthly tier.

### `support.js`
- `PAYMENT_LINKS` constant at the top with six keys: `once5`, `once10`, `once25`,
  `monthly5`, `monthly10`, `monthly20` — each initialized to the placeholder
  string `"PASTE_LINK_HERE"` for the user to replace with real payment links
  (e.g. Stripe/Ko-fi links) later.
- Each tier button carries a `data-tier` attribute matching a `PAYMENT_LINKS`
  key. One delegated click handler resolves the link.
- **Placeholder behavior:** if the value is still `"PASTE_LINK_HERE"`, show a
  small inline notice on the page ("Payment link not set up yet") instead of
  opening a broken tab.
- **Real-link behavior:** open via `window.open(url, "_blank", "noopener")` —
  a regular extension page needs no `chrome.tabs` API for this.
- Logic is commented throughout (the user is learning).

## Constraints
- Vanilla HTML/CSS/JS only; no frameworks, no build step.
- No new manifest permissions; no `manifest.json` changes at all.
- No payment processing inside the extension; no tracking or analytics.
- All user-facing copy is original.

## Docs
Update the README Features bullet: describe the heart icon + support page
instead of the removed footer link. Update the "Folder contents" tree to list
`support.html`, `support.css`, `support.js`.

## Testing (manual — project has no test framework)
1. Reload the extension; popup shows the heart icon at the header's right edge,
   footer link is gone; check both light and dark mode.
2. Click the heart: a new tab opens with the support page; popup closes.
3. Support page renders correctly in light and dark mode.
4. Clicking any tier button (links still placeholders) shows the inline
   "not set up yet" notice; no broken tab opens.
5. Paste a real URL into one `PAYMENT_LINKS` entry, reload, click that tier:
   it opens in a new tab.
6. No console errors in popup or support page DevTools.
