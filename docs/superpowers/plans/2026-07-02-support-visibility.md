# Support Visibility & Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the popup's support entry point to a labeled amber pill button and add a persisted, anti-nag "value-moment" nudge banner that appears on the popup open following a qualifying session restore.

**Architecture:** Static MV3 extension, all popup logic in `popup.js`. Additive changes only: the pill reuses the existing `#support-btn` element and click handler; the nudge is a hidden banner in `popup.html` plus a small commented state machine in `popup.js` persisting one `chrome.storage.local` key (`supportNudge`). Restores record a pending nudge *before* opening the window (the popup dies when the new window takes focus); the next popup open decides whether to show it.

**Tech Stack:** Vanilla HTML/CSS/JS, `chrome.storage.local`, `chrome.tabs` (all already in use).

## Global Constraints

- No new permissions; no `manifest.json` changes (spec).
- Vanilla HTML/CSS/JS; no frameworks; minimal diff, additive only (spec).
- Banner copy: "Tab Snapshot just brought back {N} tabs for you. If it saves you time, consider supporting it ♥" with real tab count (spec).
- Anti-nag rules in order: never if `dismissCount >= 2`; never if `restoreCount <= 3`; never within 14 days of `lastShownAt`; only if `pendingTabCount > 0` (spec).
- Showing the banner immediately sets `lastShownAt` and zeroes `pendingTabCount` (spec).
- × increments `dismissCount`; the banner's Support button does **not** (spec).
- Pill: heart + "Support", amber-soft background, amber border, `border-radius: 999px`, `title="Support Tab Snapshot ♥"`, `aria-label="Support Tab Snapshot"` (spec).
- Frequency logic clearly commented — the owner is learning (spec).
- No test framework exists; verification is manual in Chrome (chrome://extensions → reload). The storage-reset snippet for testing is in the spec's Testing section.
- Per user preference: commit AND push to origin after each task.

---

### Task 1: Header pill button

**Files:**
- Modify: `popup.html` (the `#support-btn` block inside `.app-header`, lines ~21-35)
- Modify: `popup.css` (replace the one-line `.support-btn` rule after `.app-title`, ~line 118)

**Interfaces:**
- Consumes: existing `supportBtn` click handler in `popup.js` (opens `support.html`, closes popup) — untouched.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Replace the button markup in `popup.html`**

Change the header button from:

```html
      <!-- Opens the bundled support page (support.html) in a new tab. -->
      <button
        id="support-btn"
        class="btn-icon support-btn"
        type="button"
        title="Support Tab Snapshot"
        aria-label="Support Tab Snapshot"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
```

to (drops `btn-icon`, adds the label text, updates the tooltip):

```html
      <!-- Opens the bundled support page (support.html) in a new tab. -->
      <button
        id="support-btn"
        class="support-btn"
        type="button"
        title="Support Tab Snapshot ♥"
        aria-label="Support Tab Snapshot"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
             stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Support
      </button>
```

- [ ] **Step 2: Replace the `.support-btn` rule in `popup.css`**

Replace:

```css
/* Heart button: sits at the far right of the header (margin-left: auto
   absorbs the free space between the title and the button). */
.support-btn { margin-left: auto; }
```

with:

```css
/* Support pill: heart + label at the far right of the header (margin-left:
   auto absorbs the free space). Amber-soft so it's noticeable in both themes
   but clearly secondary to the solid Save button. */
.support-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.support-btn:hover { background: var(--primary); color: var(--on-primary); }
.support-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
```

- [ ] **Step 3: Verify manually**

1. Reload the extension at `chrome://extensions`; open the popup.
2. Expected: pill reading "♥ Support" at the header's far right; amber-tinted
   but quieter than the Save button; hover fills it solid amber; tooltip says
   "Support Tab Snapshot ♥"; click opens support.html and closes the popup.
3. Check dark mode: soft dark-amber background, bright amber text.

- [ ] **Step 4: Commit and push**

```bash
git add popup.html popup.css
git commit -m "feat: upgrade support entry to labeled amber pill button"
git push
```

---

### Task 2: Value-moment nudge banner

**Files:**
- Modify: `popup.html` (add hidden banner after `</section>`, before the `<script>` tag)
- Modify: `popup.css` (add nudge styles at the end of the file)
- Modify: `popup.js` (element lookups near top; nudge state helpers; hook in `reopenSession`; wiring in `DOMContentLoaded`)

**Interfaces:**
- Consumes: existing `pluralizeTabs(count)` helper (popup.js); existing `reopenSession(session)`; header handler pattern `chrome.tabs.create({ url: chrome.runtime.getURL("support.html") })`.
- Produces: storage key `supportNudge` with shape `{ restoreCount, lastShownAt, dismissCount, pendingTabCount }` (all numbers), documented in the spec.

- [ ] **Step 1: Add the banner markup to `popup.html`**

Insert after the closing `</section>` and before `<script src="popup.js"></script>`:

```html
    <!-- Value-moment nudge: hidden by default. popup.js shows it (at most
         once per 14 days, never after 2 dismissals) on the popup open that
         follows a session restore. -->
    <div id="nudge" class="nudge" hidden>
      <p id="nudge-text" class="nudge-text"></p>
      <button id="nudge-support" class="nudge-support" type="button">Support ♥</button>
      <button id="nudge-close" class="nudge-close" type="button" title="Dismiss" aria-label="Dismiss">✕</button>
    </div>
```

- [ ] **Step 2: Add nudge styles at the end of `popup.css`**

```css
/* ========================= Value-moment nudge =========================== */
/* A quiet thank-you card at the bottom of the popup. Deliberately calm:
   panel background, normal borders — the amber lives only on the button. */
.nudge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
}
.nudge-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  color: var(--text);
}
.nudge-support {
  flex: none;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.nudge-support:hover { background: var(--primary); color: var(--on-primary); }
.nudge-support:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.nudge-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.nudge-close:hover { color: var(--text); background: var(--border); }
.nudge-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
```

- [ ] **Step 3: Add element lookups in `popup.js`**

After the existing lookups (below `const supportBtn = ...`):

```js
const nudgeEl         = document.getElementById("nudge");
const nudgeTextEl     = document.getElementById("nudge-text");
const nudgeSupportBtn = document.getElementById("nudge-support");
const nudgeCloseBtn   = document.getElementById("nudge-close");
```

- [ ] **Step 4: Add the nudge state machine to `popup.js`**

Insert a new section between the "Actions" section and the "Rendering" section:

```js
// ===========================================================================
// Support nudge — a "value moment" thank-you shown after restores
// ===========================================================================
//
// The popup CLOSES the instant a restored window takes focus, so we can't
// show anything at restore time. Instead each restore records a "pending
// nudge" in storage, and the NEXT popup open decides whether to show it.
//
// Anti-nag rules (in order — the first match wins and we stay silent):
//   1. The user dismissed it twice           → never show again.
//   2. Fewer than 4 lifetime restores        → too early, stay quiet.
//   3. Shown less than 14 days ago           → still in cooldown.
//   4. No restore happened since last check  → nothing to thank for.

const NUDGE_KEY = "supportNudge";
const NUDGE_FREE_RESTORES = 3;                       // first 3 are nudge-free
const NUDGE_COOLDOWN_MS   = 14 * 24 * 60 * 60 * 1000; // 14 days
const NUDGE_MAX_DISMISSALS = 2;                      // two ✕ = never again

// Read the nudge state, falling back to a fresh zeroed record on first run.
async function getNudgeState() {
  const data = await chrome.storage.local.get(NUDGE_KEY);
  return data[NUDGE_KEY] || {
    restoreCount: 0,    // lifetime restores
    lastShownAt: 0,     // epoch ms of the last time the banner was shown
    dismissCount: 0,    // how many times the user clicked ✕
    pendingTabCount: 0, // tab count of the last restore; 0 = nothing pending
  };
}

async function saveNudgeState(state) {
  await chrome.storage.local.set({ [NUDGE_KEY]: state });
}

// Called by reopenSession BEFORE the window opens (after it, the popup may
// already be gone). Remembers the restore for the next popup open.
async function recordRestore(tabCount) {
  const state = await getNudgeState();
  state.restoreCount += 1;
  state.pendingTabCount = tabCount;
  await saveNudgeState(state);
}

// Called once when the popup opens. Applies the anti-nag rules above and,
// if they all pass, fills in the real tab count and reveals the banner.
async function maybeShowNudge() {
  const state = await getNudgeState();

  if (state.dismissCount >= NUDGE_MAX_DISMISSALS) return; // rule 1
  if (state.restoreCount <= NUDGE_FREE_RESTORES) return;  // rule 2
  if (Date.now() - state.lastShownAt < NUDGE_COOLDOWN_MS) return; // rule 3
  if (state.pendingTabCount <= 0) return;                 // rule 4

  nudgeTextEl.textContent =
    `Tab Snapshot just brought back ${pluralizeTabs(state.pendingTabCount)} ` +
    `for you. If it saves you time, consider supporting it ♥`;
  nudgeEl.hidden = false;

  // Mark it shown RIGHT AWAY (not on dismiss): even if the user closes the
  // popup without touching the banner, that still counts as one showing —
  // otherwise we'd re-nag on every open until they interact, which is
  // exactly the pushiness we're trying to avoid.
  state.lastShownAt = Date.now();
  state.pendingTabCount = 0;
  await saveNudgeState(state);
}
```

- [ ] **Step 5: Hook `recordRestore` into `reopenSession`**

Change `reopenSession` from:

```js
async function reopenSession(session) {
  const urls = session.tabs.map((tab) => tab.url);
  try {
    // Opens a NEW window, one tab per URL. chrome.windows.create needs no
    // permission entry in the manifest.
    await chrome.windows.create({ url: urls, focused: true });
  } catch (err) {
    showStatus("Some tabs couldn't be reopened (e.g. chrome:// pages).", true);
    console.error("windows.create failed:", err);
  }
}
```

to:

```js
async function reopenSession(session) {
  const urls = session.tabs.map((tab) => tab.url);

  // Record the restore BEFORE opening the window: once the new window takes
  // focus this popup closes, and any code after that point may never run.
  await recordRestore(session.tabs.length);

  try {
    // Opens a NEW window, one tab per URL. chrome.windows.create needs no
    // permission entry in the manifest.
    await chrome.windows.create({ url: urls, focused: true });
  } catch (err) {
    showStatus("Some tabs couldn't be reopened (e.g. chrome:// pages).", true);
    console.error("windows.create failed:", err);
  }
}
```

- [ ] **Step 6: Wire the banner buttons and the open-check in `DOMContentLoaded`**

Add inside the `DOMContentLoaded` listener, after the `supportBtn` handler:

```js
  // Nudge banner: ✕ counts as a dismissal (two of those and it's gone for
  // good — respecting the "no" matters more than squeezing a tip).
  nudgeCloseBtn.addEventListener("click", async () => {
    nudgeEl.hidden = true;
    const state = await getNudgeState();
    state.dismissCount += 1;
    await saveNudgeState(state);
  });

  // The banner's Support button is NOT a dismissal — it opens the support
  // page just like the header pill does.
  nudgeSupportBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("support.html") });
    window.close();
  });
```

And add `maybeShowNudge();` after the existing `render();` call at the bottom of the listener:

```js
  updateSaveButtonCount();
  render();
  maybeShowNudge();
```

- [ ] **Step 7: Verify manually**

1. Reload the extension. Save a session with a few tabs.
2. Restore it 3 times (reopening the popup between restores). Expected: no
   banner on any popup open — first 3 restores are nudge-free.
3. Restore a 4th time, reopen the popup. Expected: banner at the bottom with
   the real tab count, Support ♥ pill, and ✕.
4. Reopen the popup again. Expected: no banner (14-day cooldown started).
5. Force-retest via popup DevTools console:
   `chrome.storage.local.set({ supportNudge: { restoreCount: 4, lastShownAt: 0, dismissCount: 0, pendingTabCount: 7 } })`
   then reopen the popup → banner shows "7 tabs".
6. Click ✕, force-retest again, click ✕ again, force-retest a third time.
   Expected: after the second ✕ the banner never appears.
7. Reset state, show the banner, click its Support button. Expected:
   support.html opens, popup closes, and `dismissCount` is still 0 (check via
   `chrome.storage.local.get("supportNudge", console.log)`).
8. Both themes look right; no console errors.

- [ ] **Step 8: Commit and push**

```bash
git add popup.html popup.css popup.js
git commit -m "feat: add anti-nag value-moment support nudge after restores"
git push
```
