# Support Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the popup's footer Ko-fi link with a heart icon in the popup header that opens a bundled pay-what-you-like support page (`support.html`) with one-time and monthly tier buttons wired to placeholder payment links.

**Architecture:** Static Chrome extension (Manifest V3), no build step, no test framework, no background worker. The support page is a normal extension page bundled with the extension and opened in a tab via `chrome.tabs.create` + `chrome.runtime.getURL` — this needs no manifest changes. `support.css` copies the popup's design-token block so both themes match without importing popup-only layout rules.

**Tech Stack:** Vanilla HTML/CSS/JS, Chrome extension APIs (`chrome.tabs`, `chrome.runtime.getURL`).

## Global Constraints

- No `manifest.json` changes; no new permissions (spec).
- No frameworks, no build step, vanilla HTML/CSS/JS only (spec).
- No payment processing in the extension; no tracking/analytics (spec).
- All user-facing copy must be original — nothing reused from Volume Master or any other extension (spec).
- Payment links live in `support.js` as `const PAYMENT_LINKS = { once5, once10, once25, monthly5, monthly10, monthly20 }`, each initialized to `"PASTE_LINK_HERE"` (spec).
- One-time tiers: 😊 $5, 🚀 $10, ❤️ $25. Monthly tiers: ⭐ $5/month, 🌟 $10/month (highlighted, "Popular option" label), 💎 $20/month (spec).
- Comment the JS logic — the owner is learning (spec).
- No test framework exists in this project (only `manifest.json`, `popup.*`, `icons/`, `README.md`); verification is manual via `chrome://extensions` → Load unpacked/reload. Adding a test harness is out of scope.
- No git repository is initialized; commit steps are recorded for later but skipped.

---

### Task 1: Create the support page (`support.html`, `support.css`, `support.js`)

Ordered first so the popup entry point (Task 2) has a real destination when tested.

**Files:**
- Create: `support.html`
- Create: `support.css`
- Create: `support.js`

**Interfaces:**
- Consumes: nothing from other tasks. Copies the `:root` design-token block and dark-mode override verbatim from `popup.css:7-78`, and the brand-mark SVG geometry from `popup.html:13-18`.
- Produces: `support.html` at the extension root — Task 2 opens it via `chrome.runtime.getURL("support.html")`. Tier buttons carry `data-tier` values `once5|once10|once25|monthly5|monthly10|monthly20` matching the `PAYMENT_LINKS` keys.

- [ ] **Step 1: Create `support.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Support Tab Snapshot</title>
    <link rel="stylesheet" href="support.css" />
  </head>
  <body>
    <main class="page">
      <!-- Same brand mark as the popup header (see popup.html) so the support
           page is instantly recognizable as part of the extension. -->
      <header class="page-header">
        <span class="app-mark" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="28" height="28">
            <rect class="mark-tile" width="16" height="16" rx="4" />
            <rect class="mark-frame" x="5" y="5" width="6" height="6" rx="1.5" />
          </svg>
        </span>
        <h1 class="page-title">Tab Snapshot</h1>
      </header>

      <!-- Intro: free forever, pay-what-you-like, and it's fine not to pay. -->
      <section class="intro">
        <h2 class="intro-heading">Thanks for using Tab Snapshot! 👋</h2>
        <p>
          Tab Snapshot is <strong>free, forever</strong> — every feature, for
          everyone. There's no locked "pro" version and there never will be.
        </p>
        <p>
          If it saves you time and you'd like to give something back, you can
          chip in whatever feels right. It keeps the project alive and puts a
          big smile on my face.
        </p>
        <p>
          And if you'd rather not? <strong>That's completely fine.</strong>
          Enjoy the extension — that's what it's for. 🙂
        </p>
      </section>

      <!-- One-time tiers. data-tier matches a key in PAYMENT_LINKS (support.js). -->
      <section class="tier-section">
        <h2 class="section-heading">One-time payment</h2>
        <p class="section-sub">A single "thanks!" — no strings attached.</p>
        <div class="tier-row">
          <button class="tier-btn" type="button" data-tier="once5">
            <span class="tier-emoji" aria-hidden="true">😊</span> $5
          </button>
          <button class="tier-btn" type="button" data-tier="once10">
            <span class="tier-emoji" aria-hidden="true">🚀</span> $10
          </button>
          <button class="tier-btn" type="button" data-tier="once25">
            <span class="tier-emoji" aria-hidden="true">❤️</span> $25
          </button>
        </div>
      </section>

      <!-- Monthly tiers. The middle one is highlighted as the popular pick. -->
      <section class="tier-section">
        <h2 class="section-heading">Monthly support</h2>
        <p class="section-sub">
          Steady support for steady improvements — cancel anytime.
        </p>
        <div class="tier-row">
          <button class="tier-btn" type="button" data-tier="monthly5">
            <span class="tier-emoji" aria-hidden="true">⭐</span> $5/month
          </button>
          <div class="tier-popular">
            <button class="tier-btn is-popular" type="button" data-tier="monthly10">
              <span class="tier-emoji" aria-hidden="true">🌟</span> $10/month
            </button>
            <span class="popular-label">Popular option</span>
          </div>
          <button class="tier-btn" type="button" data-tier="monthly20">
            <span class="tier-emoji" aria-hidden="true">💎</span> $20/month
          </button>
        </div>
      </section>

      <!-- Inline notice shown by support.js when a link isn't configured yet.
           aria-live makes screen readers announce it when it appears. -->
      <p id="notice" class="notice" role="status" aria-live="polite" hidden></p>

      <footer class="page-footer">
        <p>
          Tab Snapshot is <strong>ad-free and tracking-free</strong> — that's
          how it should be.
        </p>
      </footer>
    </main>

    <script src="support.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `support.css`**

The `:root` block and dark override are copied verbatim from `popup.css` so the identity stays in sync; everything below them is page-specific.

```css
/* support.css — Tab Snapshot's support page.
   The design tokens below are COPIED from popup.css so both share the same
   Slate & Amber identity in light and dark mode. We don't link popup.css
   because it hardcodes popup-only layout (body { width: 360px } etc.). */

/* ============================ Design tokens ============================== */
/* (Copied from popup.css — keep in sync if the identity is ever retuned.) */
:root {
  --primary:       #b45309;
  --primary-hover: #92400e;
  --primary-soft:  #fdf0e1;
  --on-primary:    #ffffff;

  --mark-tile: #f59e0b;
  --mark-ink:  #1c1917;

  --bg:            #ffffff;
  --card:          #ffffff;
  --card-hover:    #faf8f4;
  --panel:         #f8f7f4;
  --border:        #e7e5e0;
  --border-strong: #d6d3cc;

  --text:  #1c1917;
  --muted: #78716c;

  --danger:       #dc2626;
  --danger-hover: #b91c1c;
  --danger-soft:  #fef2f2;
  --on-danger:    #ffffff;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  --radius:    10px;
  --radius-sm: 7px;
  --shadow: 0 1px 2px rgba(17, 12, 46, 0.06),
            0 6px 16px rgba(17, 12, 46, 0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary:       #f59e0b;
    --primary-hover: #fbbf24;
    --primary-soft:  #3a2e1a;
    --on-primary:    #1c1917;

    --bg:            #1a1714;
    --card:          #231f1a;
    --card-hover:    #2b2620;
    --panel:         #231f1a;
    --border:        #38332b;
    --border-strong: #4a4339;

    --text:  #f5f2ec;
    --muted: #a89f93;

    --danger:       #f87171;
    --danger-hover: #fca5a5;
    --danger-soft:  #2a1c1a;
    --on-danger:    #1c1917;

    --shadow: 0 1px 2px rgba(0, 0, 0, 0.45),
              0 8px 20px rgba(0, 0, 0, 0.4);
  }
}

/* ================================ Base ================================== */
* { box-sizing: border-box; }
[hidden] { display: none !important; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

/* Centered single column. */
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-6);
}

/* =============================== Header ================================= */
.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--border);
}
.app-mark { display: inline-flex; flex: none; }
.app-mark .mark-tile  { fill: var(--mark-tile); }
.app-mark .mark-frame { fill: none; stroke: var(--mark-ink); stroke-width: 2; }
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ================================ Intro ================================= */
.intro-heading { margin: 0 0 var(--space-3); font-size: 19px; }
.intro p { margin: 0 0 var(--space-3); }

/* ============================ Tier sections ============================= */
.tier-section { margin-top: var(--space-6); }
.section-heading { margin: 0; font-size: 17px; }
.section-sub { margin: var(--space-1) 0 var(--space-4); color: var(--muted); font-size: 13px; }

/* Three equal columns; the highlighted middle tier stacks its label below. */
.tier-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  align-items: start;
}
@media (max-width: 480px) {
  .tier-row { grid-template-columns: 1fr; }
}

.tier-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--card);
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease,
              box-shadow 0.12s ease;
}
.tier-btn:hover {
  border-color: var(--primary);
  background: var(--card-hover);
  box-shadow: var(--shadow);
}
.tier-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.tier-emoji { font-size: 18px; }

/* Highlighted middle monthly tier + its "Popular option" label. */
.tier-popular {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.tier-btn.is-popular {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}
.popular-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}

/* ====================== "Link not set up" notice ======================== */
.notice {
  margin: var(--space-5) 0 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

/* =============================== Footer ================================= */
.page-footer {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.page-footer p { margin: 0; }
```

- [ ] **Step 3: Create `support.js`**

```js
// support.js — logic for the support page.
//
// The extension never processes payments itself. Each tier button just opens
// an external payment link (Stripe, Ko-fi, etc.) in a new tab. The links are
// kept here as plain constants so they're easy to find and replace.

"use strict";

// ---------------------------------------------------------------------------
// PASTE YOUR REAL PAYMENT LINKS HERE.
// Each key matches the data-tier attribute of one button in support.html.
// Until a link is pasted, clicking that button shows a friendly notice
// instead of opening a broken tab.
// ---------------------------------------------------------------------------
const PAYMENT_LINKS = {
  once5:     "PASTE_LINK_HERE",
  once10:    "PASTE_LINK_HERE",
  once25:    "PASTE_LINK_HERE",
  monthly5:  "PASTE_LINK_HERE",
  monthly10: "PASTE_LINK_HERE",
  monthly20: "PASTE_LINK_HERE",
};

// The sentinel value above, factored out so the check below reads clearly.
const PLACEHOLDER = "PASTE_LINK_HERE";

// The inline notice element (hidden until we need it).
const noticeEl = document.getElementById("notice");
let noticeTimer; // so a second click restarts the auto-hide countdown

// Show a short message under the tiers, then hide it after a few seconds.
function showNotice(message) {
  noticeEl.textContent = message;
  noticeEl.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { noticeEl.hidden = true; }, 4000);
}

// One delegated listener for the whole page instead of six separate ones:
// clicks bubble up from whatever was clicked, and we check whether it was
// (or was inside) a button that carries a data-tier attribute.
document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-tier]");
  if (!btn) return; // the click wasn't on a tier button

  const url = PAYMENT_LINKS[btn.dataset.tier];

  if (!url || url === PLACEHOLDER) {
    // Link not configured yet — tell the visitor instead of opening a
    // broken tab. (For the developer: paste real links into PAYMENT_LINKS.)
    showNotice("This payment link isn't set up yet — check back soon!");
    return;
  }

  // Open the payment page in a new tab. "noopener" prevents the opened page
  // from being able to script this one — good hygiene for external links.
  window.open(url, "_blank", "noopener");
});
```

- [ ] **Step 4: Manually verify the page in isolation**

1. In `chrome://extensions`, reload Tab Snapshot (Developer mode on).
2. Copy the extension ID from its card, then visit
   `chrome-extension://<that-id>/support.html` in a normal tab.
3. Expected: centered column; brand mark + "Tab Snapshot" header; intro copy;
   "One-time payment" row (😊 $5 / 🚀 $10 / ❤️ $25); "Monthly support" row
   (⭐ $5/month / highlighted 🌟 $10/month with "Popular option" below / 💎
   $20/month); footer note. No horizontal scrollbar.
4. Click any tier: the "isn't set up yet" notice appears below the tiers and
   disappears after ~4 seconds. No new tab opens.
5. Toggle OS dark mode and refresh: page follows the dark theme.
6. DevTools console (F12): no errors.

- [ ] **Step 5: Commit**

No git repository — skipped. For later:

```bash
git add support.html support.css support.js
git commit -m "feat: add pay-what-you-like support page"
```

---

### Task 2: Popup entry point — heart icon in header, footer link removed

**Files:**
- Modify: `popup.html` (header block at lines 9-20; footer block at lines 81-83)
- Modify: `popup.css` (header rules around lines 100-115; `.support-footer` block at end of file)
- Modify: `popup.js` (element lookups around line 28; `DOMContentLoaded` block at end of file)
- Modify: `README.md` (Features bullet lines 27-28; folder tree lines 30-41; permissions note is unaffected)

**Interfaces:**
- Consumes: `support.html` from Task 1, resolved at runtime via `chrome.runtime.getURL("support.html")`.
- Produces: nothing further — final task.

- [ ] **Step 1: Replace the footer link with a header heart button in `popup.html`**

Delete these lines (81-83):

```html
    <footer class="support-footer">
      <a id="support-link" class="support-link" href="https://ko-fi.com/janko765">☕ Support this extension</a>
    </footer>

```

Then change the header block (lines 9-20) from:

```html
    <header class="app-header">
      <!-- Brand mark: same design as the toolbar icon (icons/*.png) — an amber
           tile holding a slate snapshot "frame". The viewBox copies icon16's
           exact geometry so popup and toolbar always match. -->
      <span class="app-mark" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="22" height="22">
          <rect class="mark-tile" width="16" height="16" rx="4" />
          <rect class="mark-frame" x="5" y="5" width="6" height="6" rx="1.5" />
        </svg>
      </span>
      <h1 class="app-title">Tab Snapshot</h1>
    </header>
```

to (adds the heart button after the title):

```html
    <header class="app-header">
      <!-- Brand mark: same design as the toolbar icon (icons/*.png) — an amber
           tile holding a slate snapshot "frame". The viewBox copies icon16's
           exact geometry so popup and toolbar always match. -->
      <span class="app-mark" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="22" height="22">
          <rect class="mark-tile" width="16" height="16" rx="4" />
          <rect class="mark-frame" x="5" y="5" width="6" height="6" rx="1.5" />
        </svg>
      </span>
      <h1 class="app-title">Tab Snapshot</h1>
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
    </header>
```

- [ ] **Step 2: Update `popup.css`**

Delete the entire support-footer block at the end of the file:

```css
/* ============================= Support footer =========================== */
.support-footer {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  text-align: center;
}
.support-link {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
}
.support-link:hover { color: var(--primary); text-decoration: underline; }
.support-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

Add one rule in the Header section (after the `.app-title` rule, around line 115). `.btn-icon` (defined lower in the file) already gives it the quiet icon-button look; this just pushes it to the header's right edge:

```css
/* Heart button: sits at the far right of the header (margin-left: auto
   absorbs the free space between the title and the button). */
.support-btn { margin-left: auto; }
```

- [ ] **Step 3: Update `popup.js`**

Replace the element lookup (line 28):

```js
const supportLink  = document.getElementById("support-link");
```

with:

```js
const supportBtn   = document.getElementById("support-btn");
```

Replace the click handler inside `DOMContentLoaded`:

```js
  supportLink.addEventListener("click", (event) => {
    event.preventDefault(); // we open it ourselves via chrome.tabs.create
    chrome.tabs.create({ url: supportLink.href });
    window.close();
  });
```

with:

```js
  // Open the bundled support page in a new tab. chrome.runtime.getURL turns
  // the relative path into our full chrome-extension://<id>/support.html URL.
  supportBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("support.html") });
    window.close();
  });
```

- [ ] **Step 4: Update `README.md`**

Replace the Features bullet (lines 27-28):

```markdown
- **Support the project** — a "☕ Support this extension" link in the footer
  opens the developer's Ko-fi page in a new tab. No tracking, no nagging.
```

with:

```markdown
- **Support the project** — a small heart icon in the header opens a bundled
  pay-what-you-like support page. No tracking, no nagging, and not paying is
  completely fine.
```

In the "Folder contents" tree, add the three support files after the `popup.js` line, so the tree reads:

```markdown
tab-snapshot/
├── manifest.json     # Extension metadata, permissions, popup + icon wiring
├── popup.html        # The popup's structure
├── popup.css         # The popup's styling (~360px wide)
├── popup.js          # All logic: capture, save, list, reopen, delete
├── support.html      # Pay-what-you-like support page (opened from the ♥ icon)
├── support.css       # Support page styling (same identity as the popup)
├── support.js        # Support page logic: tier buttons → payment links
├── icons/
│   ├── icon16.png    # Toolbar icon
│   ├── icon48.png    # Extensions page icon
│   └── icon128.png   # Large / store icon
└── README.md         # This file
```

- [ ] **Step 5: Manually verify end-to-end**

1. Reload the extension in `chrome://extensions`.
2. Open the popup. Expected: heart icon at the header's far right; the old
   footer link is gone; heart shows the "Support Tab Snapshot" tooltip on
   hover and turns amber (`--primary`) on hover, matching the pencil icon's
   behavior.
3. Click the heart. Expected: a new tab opens with the support page; the
   popup closes.
4. On the support page, click a tier: the "isn't set up yet" notice appears
   (links are still placeholders).
5. Toggle OS dark mode: popup and support page both follow it.
6. Keyboard: Tab to the heart, press Enter — same result as clicking.
7. No console errors in the popup or support page DevTools.

- [ ] **Step 6: Commit**

No git repository — skipped. For later:

```bash
git add popup.html popup.css popup.js README.md
git commit -m "feat: replace footer tip link with header heart opening support page"
```
