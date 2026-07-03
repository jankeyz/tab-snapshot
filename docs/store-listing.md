# Chrome Web Store listing — copy-paste material

Everything the Developer Dashboard asks for, ready to paste.

## Store listing tab

**Name:** Tab Snapshot

**Short description** (the line under the name, max 132 chars):

> Save all your tabs as named sessions and bring them back in one click. Local-only, ad-free, tracking-free.

**Detailed description:**

> Ever lost thirty tabs of research to a browser crash, an accidental
> "close window", or a laptop that died at the worst moment? Tab Snapshot
> makes that impossible.
>
> SAVE — one click captures every tab in your window as a named session.
> Leave the name blank and it names itself.
>
> RESTORE — reopen the whole set in a new window with one click, or expand
> a session and reopen just the tab you need.
>
> ORGANIZE — rename sessions, update them with your current tabs, search
> them once your list grows, and see favicon previews at a glance.
>
> PRIVATE BY DESIGN — everything stays in your browser's local storage.
> No account, no server, no analytics, no ads, no tracking. Ever.
>
> FREE — every feature above is free, forever. If the extension saves your
> bacon and you'd like to support one indie developer, supporters unlock
> Auto-Snapshot: automatic background backups of your open tabs every
> 5 minutes, so even a crash you never saw coming can't take your tabs
> with it.

**Category:** Workflow & Planning (under Productivity)

**Language:** English

## Privacy tab

**Single purpose description:**

> Save the open tabs in a window as a named session and restore them later.

**Permission justifications:**

- `tabs` — Reads the titles and URLs of the user's open tabs so they can be
  saved as a session. This is the extension's core function.
- `storage` — Stores saved sessions locally on the user's device in
  chrome.storage.local. No data leaves the device.
- `favicon` — Displays site icons next to saved tabs using Chrome's
  built-in favicon cache, so sessions are recognizable at a glance.
- `alarms` — Runs the optional Auto-Snapshot feature: a periodic timer that
  saves the user's open tabs locally in the background so a browser crash
  cannot lose them.
- Remote code: **No, I am not using remote code** (all code ships in the
  package).

**Data usage questionnaire:** check **"Web history"** (tab URLs/titles are
saved — but only locally). Then certify the three disclosures truthfully:

- [x] I do **not** sell or transfer user data to third parties
- [x] I do **not** use or transfer user data for purposes unrelated to the
  item's single purpose
- [x] I do **not** use or transfer user data to determine creditworthiness
  or for lending purposes

**Privacy policy URL:** `https://github.com/jankeyz/tab-snapshot/blob/main/PRIVACY.md`
(requires the repo to be public — see publishing guide.)

## Assets

- Store icon: `icons/icon128.png` (already in the repo)
- Screenshots: 1280×800 PNGs prepared in `Desktop\tab-snapshot-store\`
