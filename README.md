# Tab Snapshot

A tiny Chrome extension (Manifest V3) that saves every tab in your current
window as a **named session**, then lets you reopen the whole set in a new
window with one click. All data stays on your machine in `chrome.storage.local`
— no accounts, no servers, no external requests.

## Features

- **Save** all tabs (title + URL) in the current window under a name you choose.
  The Save button shows the live count, e.g. **"Save 6 tabs"**. Leave the name
  blank and one is generated for you (e.g. `Session · Jul 1, 21:48`).
- **Browse** saved sessions (newest first) as cards showing the name, tab count,
  a **relative timestamp** ("2 hours ago" — exact date on hover), and a strip of
  favicons.
- **Expand** a card (click it, or the chevron) to list every tab's title; click
  any title to **open that one tab**. Several cards can be expanded at once.
- **Restore** — open all a session's tabs in a new window — via its **Restore**
  button (never from a general card click).
- **Update** a session's tabs to whatever is open right now, with the **Update**
  button.
- **Rename** a session inline with the pencil icon.
- **Search** your sessions with a filter box that appears once you have 5+.
- **Delete** any session with the ✕ button (inline "are you sure?" confirmation;
  only one card can be confirming at a time).
- **Light & dark mode** — follows your system theme automatically.
- **Support the project** — a small heart icon in the header opens a bundled
  pay-what-you-like support page. No tracking, no nagging, and not paying is
  completely fine.

## Folder contents

```
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

## Install it (Developer Mode)

1. Open Chrome and go to **`chrome://extensions`** (type it in the address bar).
2. Turn on **Developer mode** using the toggle in the **top-right** corner.
3. Click **Load unpacked** (top-left).
4. In the file picker, select this **`tab-snapshot`** folder (the one containing
   `manifest.json`) and confirm.
5. Tab Snapshot now appears in your extensions list. Click the **puzzle-piece**
   icon in the toolbar and **pin** it so its icon is always visible.

If you edit any file later, return to `chrome://extensions` and click the
**circular reload icon** on the Tab Snapshot card to load your changes.

## How to use

1. Open the windows/tabs you want to remember.
2. Click the **Tab Snapshot** toolbar icon.
3. Type a name (e.g. "Research") and click **Save** (or press Enter).
4. Your session appears in the list below with its tab count and date.
5. Click a session card to **expand** it and see every tab's title; click a
   title to open just that tab, or **Restore** to open them all in a new window.
6. Use **Update** to refresh a session's tabs, the **pencil** to rename, and the
   ✕ (then **Delete**) to remove one.

## Notes & limitations

- **Permissions:** `tabs` (to read tab titles/URLs), `storage` (to save sessions
  locally), and `favicon` (to show tab icons via Chrome's built-in favicon
  service). Nothing is sent anywhere. Opening individual tabs and Update add
  **no** new permissions — `chrome.tabs.create` only needs reading permission
  (already granted).
- **Favicons:** these come from Chrome's own cache at
  `chrome-extension://<id>/_favicon/?pageUrl=…&size=32` (enabled by the `favicon`
  permission). Pages Chrome hasn't cached an icon for show a neutral globe.
- **Current window only:** Save captures the window the popup was opened from.
- **Internal pages:** Chrome does not allow extensions to reopen certain pages
  such as `chrome://…` or the New Tab page. If a saved session contains one,
  the reopen call is rejected and a small warning is shown instead. (Tip: this
  is the simplest, honest behavior for a first extension — a future improvement
  would be to filter those URLs out before reopening the rest.)
- **Storage:** sessions live in `chrome.storage.local`, which is per-profile and
  persists across restarts. Removing the extension clears its stored sessions.

## How the pieces fit together

The popup is the entire app — there is no background service worker, because all
work happens while the popup is open:

- Opening the popup reads `chrome.storage.local` and renders the session list.
- **Save** calls `chrome.tabs.query({ currentWindow: true })`, keeps each tab's
  `title` + `url`, and writes the new session to storage.
- **Click a session** calls `chrome.windows.create({ url: [...] })` to open a new
  window with all its tabs.
- **Delete** removes the session from the array and writes it back.

Every change re-reads storage and re-renders the list, so what you see always
matches what's saved.
