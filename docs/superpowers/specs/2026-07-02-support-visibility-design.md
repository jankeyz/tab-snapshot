# Support Visibility & Value-Moment Nudge — Design

## Purpose
Make supporting the project more visible and more likely to convert, without
making the extension feel naggy. Two changes: upgrade the header entry point
from a bare heart icon to a labeled pill button, and add a dismissible
"value-moment" nudge banner tied to session restores.

## 1. Header pill button

Upgrades the existing `#support-btn` in the popup header (keeps the id and the
existing click handler that opens `support.html` via `chrome.tabs.create` +
`chrome.runtime.getURL`, then closes the popup).

- **Shape/content:** pill (`border-radius: 999px`) containing the heart SVG +
  the text "Support".
- **Style:** subtle amber treatment — `--primary-soft` background, light amber
  border, `--primary` text/icon. Noticeable in both light and dark themes but
  visually secondary to the solid amber Save button.
- **Position:** unchanged — far right of `.app-header` via the existing
  `margin-left: auto` on `.support-btn`.
- **Accessibility:** `title="Support Tab Snapshot ♥"`,
  `aria-label="Support Tab Snapshot"`.

## 2. Value-moment nudge banner

### Why "next popup open" instead of "right after restore"
Restore opens a new focused window, and Chrome closes the popup the moment it
loses focus — a banner shown at restore time would never be seen. So a
qualifying restore records a **pending nudge**, and the banner is shown on the
**next popup open** (decided with the user).

### Behavior
- On a successful Restore, before opening the window: increment the lifetime
  restore counter and record the restored tab count as pending.
- On popup open, if the anti-nag rules pass, show a dismissible banner at the
  bottom of the popup:

  > Tab Snapshot just brought back **{N} tabs** for you. If it saves you time,
  > consider supporting it ♥

  with a **Support** button and an **×** dismiss button. `{N}` is the real tab
  count from the pending restore (uses the existing `pluralizeTabs` helper).

### State — one `chrome.storage.local` key: `supportNudge`
```js
{
  restoreCount: 0,     // total restores ever — banner needs > 3
  lastShownAt: 0,      // epoch ms — at most once per 14 days
  dismissCount: 0,     // × clicks — 2 strikes and it never shows again
  pendingTabCount: 0   // tab count from the last qualifying restore (0 = none)
}
```

### Anti-nag rules (checked in order at popup open)
1. Never if `dismissCount >= 2` (two dismissals = never again).
2. Never if `restoreCount <= 3` (the user's first 3 restores are nudge-free).
3. Never if `Date.now() - lastShownAt < 14 days`.
4. Only if `pendingTabCount > 0`.

**Showing the banner immediately sets `lastShownAt` and clears
`pendingTabCount`** — closing the popup without touching the banner still
counts as "shown" and will not re-nag before the cooldown expires.

### Button semantics
- **×**: increments `dismissCount`, hides the banner. Respecting the "no"
  matters more than squeezing a tip.
- **Support**: opens `support.html` (same handler pattern as the header
  button), hides the banner, does **not** count as a dismissal strike.

### Placement & style
- Banner markup lives in `popup.html`, hidden by default; shown/filled by
  `popup.js`.
- Positioned at the bottom of the popup (after the sessions section).
- Styled with existing tokens (`--panel`, `--border`, `--text`, `--muted`,
  amber accents for the Support button) — quiet, not alarming, both themes.

## 3. Microcopy
Warm, zero guilt-tripping, consistent with support.html's "free forever" tone.
The banner states what the extension did for the user, invites once, and the ×
is always available.

## Constraints
- Vanilla HTML/CSS/JS; no frameworks.
- No new permissions (`storage` and `tabs` already granted); no
  `manifest.json` changes.
- Minimal diff — additive changes only, no restructuring of existing code.
- The frequency logic in `popup.js` must be clearly commented (the owner is
  learning).

## Testing (manual — no test framework)
1. Pill button: visible in header (both themes), amber but secondary to Save,
   tooltip on hover, opens support page, popup closes.
2. Fresh state: restore sessions 1-3 → reopen popup → no banner.
3. Restore #4 → reopen popup → banner appears with the correct tab count.
4. Reopen popup again immediately → no banner (14-day cooldown).
5. To retest without waiting 14 days: in the popup's DevTools console, run
   `chrome.storage.local.set({ supportNudge: { restoreCount: 4, lastShownAt: 0, dismissCount: 0, pendingTabCount: 7 } })`
   and reopen the popup.
6. Dismiss twice (using the reset trick between) → banner never returns even
   with a fresh pending restore.
7. Banner's Support button opens support.html and doesn't increment
   `dismissCount`.
8. No console errors.
