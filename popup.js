// popup.js — all the logic for the Tab Snapshot popup.
//
// Runs fresh each time the popup opens and stops when it closes. Nothing is kept
// in memory between opens: we read/write everything through chrome.storage.local
// on demand, which is why there's no background service worker in this project.

"use strict";

// The single key under which we store our array of sessions.
const STORAGE_KEY = "sessions";

// How many favicons the collapsed preview strip shows before a "+N" badge.
const MAX_FAVICONS = 5;

// Show the search box only once the user has at least this many sessions.
const SEARCH_MIN = 5;

// --- Elements (script is at the end of <body>, so these already exist). -----
const form         = document.getElementById("save-form");
const nameInput    = document.getElementById("session-name");
const statusEl     = document.getElementById("status");
const listEl       = document.getElementById("session-list");
const emptyStateEl = document.getElementById("empty-state");
const noMatchesEl  = document.getElementById("no-matches");
const saveBtnLabel = document.getElementById("save-btn-label");
const searchWrap   = document.getElementById("search-wrap");
const searchInput  = document.getElementById("search");
const supportBtn   = document.getElementById("support-btn");

// --- Shared UI state -------------------------------------------------------
// At most ONE card may show its "Are you sure?" row at a time. We keep the
// function that closes whichever card is confirming; null when none is open.
let closeActiveConfirm = null;

// The current text in the search box. Kept here (not just in the input) so
// render() can filter the list by it. Empty string = no filter.
let searchQuery = "";

// ===========================================================================
// Storage helpers
// ===========================================================================

// chrome.storage.local is the extension's private key/value store: it survives
// restarts and is shared across the extension's pages. In Manifest V3 these
// methods return Promises when you omit the callback, so we can await them.
async function getSessions() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || []; // undefined on first run → empty array
}

async function saveSessions(sessions) {
  await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
}

// ===========================================================================
// Tabs
// ===========================================================================

// Grab every tab in the popup's window, reduced to just title + url.
// Reading url/title needs the "tabs" permission (declared in manifest.json).
async function captureCurrentWindowTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.map((tab) => ({ title: tab.title, url: tab.url }));
}

// Update the Save button so it advertises how many tabs will be captured.
async function updateSaveButtonCount() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  saveBtnLabel.textContent = `Save ${pluralizeTabs(tabs.length)}`;
}

// ===========================================================================
// Actions: save / update / rename / restore / open-one / delete
// ===========================================================================

async function handleSave(event) {
  event.preventDefault(); // stop the <form> from reloading the popup

  // FEATURE 3: if the name field is blank, invent a timestamped name.
  const typed = nameInput.value.trim();
  const name = typed || autoName();

  const tabs = await captureCurrentWindowTabs();
  const session = {
    id: crypto.randomUUID(), // unique id used to find/update/delete this one
    name,
    tabs,
    createdAt: Date.now(),   // "last saved" time — also updated by Update below
  };

  const sessions = await getSessions();
  sessions.unshift(session);
  await saveSessions(sessions);

  nameInput.value = "";
  showStatus(`Saved “${name}” (${pluralizeTabs(tabs.length)}).`);
  await render();
}

// FEATURE 4: overwrite an existing session with the tabs open right now.
async function updateSession(session) {
  const tabs = await captureCurrentWindowTabs();
  const sessions = await getSessions();
  const target = sessions.find((s) => s.id === session.id);
  if (!target) return;

  target.tabs = tabs;
  target.createdAt = Date.now(); // treat as "last saved" so it sorts to the top
  await saveSessions(sessions);

  showStatus(`Updated “${target.name}” (${pluralizeTabs(tabs.length)}).`);
  await render();
}

// FEATURE 2: change a session's name.
async function renameSession(id, newName) {
  const name = newName.trim();
  if (!name) return; // ignore empty names (keeps the old one)

  const sessions = await getSessions();
  const target = sessions.find((s) => s.id === id);
  if (!target || target.name === name) return; // no change → nothing to do

  target.name = name;
  await saveSessions(sessions);
  await render();
}

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

// FEATURE 1: open a single tab from the expanded list.
async function openSingleTab(url, title) {
  try {
    // active:false opens the tab in the BACKGROUND, so the popup keeps focus
    // (and stays open) — handy for opening several tabs in a row.
    // chrome.tabs.create needs no permission; "tabs" only gates reading data.
    await chrome.tabs.create({ url, active: false });
    showStatus(`Opened: ${title || url}`);
  } catch (err) {
    showStatus("That page can't be opened (e.g. a chrome:// page).", true);
    console.error("tabs.create failed:", err);
  }
}

async function deleteSession(id) {
  const sessions = await getSessions();
  await saveSessions(sessions.filter((session) => session.id !== id));
  await render();
}

// ===========================================================================
// Rendering
// ===========================================================================

async function render() {
  const all = await getSessions();

  // A fresh render rebuilds every card, so nothing is confirming afterward.
  closeActiveConfirm = null;

  // FEATURE 5a: newest-first. Sort a COPY so we don't mutate stored order.
  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);

  // FEATURE 5b: show the search box only when there are enough sessions.
  const showSearch = all.length >= SEARCH_MIN;
  searchWrap.hidden = !showSearch;
  if (!showSearch) searchQuery = "";        // reset the filter when it's hidden
  if (searchInput.value !== searchQuery) searchInput.value = searchQuery;

  // Apply the text filter (by name and by any tab title/url).
  const q = searchQuery.trim().toLowerCase();
  const visible = q ? sorted.filter((s) => sessionMatches(s, q)) : sorted;

  // Rebuild the list.
  listEl.replaceChildren();
  for (const session of visible) {
    listEl.appendChild(createSessionItem(session));
  }

  // Two different "empty" messages:
  emptyStateEl.hidden = all.length !== 0;                       // no sessions at all
  noMatchesEl.hidden = !(all.length > 0 && visible.length === 0); // filtered to nothing
}

// Does this session match the search query? Checks the name and every tab.
function sessionMatches(session, q) {
  if (session.name.toLowerCase().includes(q)) return true;
  return session.tabs.some(
    (t) =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.url && t.url.toLowerCase().includes(q))
  );
}

// Build one <li> for a session.
//
// We build nodes with createElement + textContent for anything derived from web
// pages (names, tab titles), so a title like "<img onerror=…>" can't run. The
// only innerHTML uses are fixed SVG strings with no user data.
function createSessionItem(session) {
  const li = document.createElement("li");
  li.className = "session-item is-expandable";

  // Card body. Clicking it toggles expand/collapse. It's a <div> (not a
  // <button>) so it can legally contain the buttons below.
  const content = document.createElement("div");
  content.className = "session-content";

  // ----- Name (with inline rename) -----
  const nameEl = document.createElement("span");
  nameEl.className = "session-name";
  nameEl.textContent = session.name;

  const metaEl = document.createElement("span");
  metaEl.className = "session-meta";
  metaEl.textContent =
    `${pluralizeTabs(session.tabs.length)} · ${relativeTime(session.createdAt)}`;
  metaEl.title = formatDate(session.createdAt); // exact date on hover

  // ----- Collapsed favicon preview strip -----
  const favicons = buildFavicons(session.tabs);

  // ----- Expandable tab-title list (FEATURE 1) -----
  // The .tab-list-wrap uses the CSS grid 0fr→1fr trick to animate open/closed.
  const listWrap = document.createElement("div");
  listWrap.className = "tab-list-wrap";
  const tabList = document.createElement("ul");
  tabList.className = "tab-list";
  for (const tab of session.tabs) tabList.appendChild(buildTabItem(tab));
  listWrap.appendChild(tabList);

  // ----- Expand / collapse indicator (a real button = keyboard-operable) -----
  const expandBtn = document.createElement("button");
  expandBtn.className = "expand-indicator";
  expandBtn.type = "button";
  expandBtn.setAttribute("aria-expanded", "false");
  expandBtn.innerHTML =
    chevronDownSVG() +
    `<span class="expand-label">Show ${pluralizeTabs(session.tabs.length)}</span>`;

  function toggleExpanded() {
    const nowExpanded = li.classList.toggle("is-expanded");
    expandBtn.setAttribute("aria-expanded", String(nowExpanded));
    expandBtn.querySelector(".expand-label").textContent =
      nowExpanded ? "Hide tabs" : `Show ${pluralizeTabs(session.tabs.length)}`;
  }
  expandBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // clicking it shouldn't ALSO fire the body toggle
    toggleExpanded();
  });

  // ----- Rename button (FEATURE 2) -----
  const renameBtn = document.createElement("button");
  renameBtn.className = "btn-icon";
  renameBtn.type = "button";
  renameBtn.title = "Rename session";
  renameBtn.setAttribute("aria-label", `Rename ${session.name}`);
  renameBtn.innerHTML = pencilSVG();
  renameBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // don't toggle the card
    startRename();
  });

  // ----- Update button (FEATURE 4) -----
  const updateBtn = document.createElement("button");
  updateBtn.className = "btn-mini btn-update";
  updateBtn.type = "button";
  updateBtn.title = "Overwrite this session with the tabs open right now";
  updateBtn.textContent = "Update";
  updateBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    updateSession(session);
  });

  // ----- Restore button -----
  const restoreBtn = document.createElement("button");
  restoreBtn.className = "btn-mini btn-restore";
  restoreBtn.type = "button";
  restoreBtn.setAttribute(
    "aria-label",
    `Restore ${session.name} (${pluralizeTabs(session.tabs.length)})`
  );
  restoreBtn.innerHTML = "Restore " + chevronRightSVG();
  restoreBtn.addEventListener("click", (event) => {
    // stopPropagation() stops this click from "bubbling" up to the card body's
    // toggle handler. Events travel from the clicked element up through its
    // ancestors ("bubbling"); the body listens on that path. Without this,
    // Restore would ALSO expand/collapse the card. (Same idea for every button
    // inside the card body: rename, update, expand, delete, and each tab.)
    event.stopPropagation();
    reopenSession(session);
  });

  // Actions row: expand indicator on the left, the button cluster on the right.
  const actions = document.createElement("div");
  actions.className = "session-actions";
  const controls = document.createElement("div");
  controls.className = "session-controls";
  controls.append(renameBtn, updateBtn, restoreBtn);
  actions.append(expandBtn, controls);

  // ----- Delete ✕ -----
  const del = document.createElement("button");
  del.className = "btn-delete";
  del.type = "button";
  del.textContent = "✕";
  del.title = "Delete this session";
  del.setAttribute("aria-label", `Delete session ${session.name}`);

  content.append(nameEl, metaEl, favicons, actions, listWrap, del);

  // Clicking anywhere on the body (that isn't a button) toggles the card.
  content.addEventListener("click", toggleExpanded);

  // ----- Inline rename implementation -----
  function startRename() {
    if (content.querySelector(".rename-input")) return; // already renaming

    const input = document.createElement("input");
    input.type = "text";
    input.className = "rename-input";
    input.value = session.name;
    input.maxLength = 60;
    input.setAttribute("aria-label", "New session name");

    // Swap the label for the field, then focus and select the text.
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let finished = false; // guard: Enter fires, then blur — only handle once

    function finish(save) {
      if (finished) return;
      finished = true;
      input.removeEventListener("blur", onBlur);

      const newName = input.value.trim();
      if (save && newName && newName !== session.name) {
        // Real change: persist it. renameSession() re-renders the whole list,
        // which rebuilds this card — so the input just disappears.
        renameSession(session.id, newName);
      } else {
        // No change / cancelled: put the original label back.
        input.replaceWith(nameEl);
      }
    }

    const onBlur = () => finish(true);            // clicking away = save
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();                    // keep keys off the card
      if (event.key === "Enter") finish(true);
      else if (event.key === "Escape") finish(false);
    });
    input.addEventListener("click", (event) => event.stopPropagation());
  }

  // ----- Confirmation row (sibling of .session-content) -----
  const confirmBar = document.createElement("div");
  confirmBar.className = "confirm-bar";
  confirmBar.hidden = true;

  const confirmText = document.createElement("span");
  confirmText.className = "confirm-text";
  confirmText.textContent = "Are you sure you want to delete this session?";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-sm btn-cancel";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn-sm btn-danger";
  confirmBtn.type = "button";
  confirmBtn.textContent = "Delete";

  confirmBar.append(confirmText, cancelBtn, confirmBtn);

  // Only one card may show its confirm row at a time (module-level pointer).
  function openConfirm() {
    if (closeActiveConfirm && closeActiveConfirm !== closeConfirm) {
      closeActiveConfirm();
    }
    confirmBar.hidden = false;
    del.hidden = true;
    confirmBtn.focus();
    closeActiveConfirm = closeConfirm;
  }
  function closeConfirm() {
    confirmBar.hidden = true;
    del.hidden = false;
    if (closeActiveConfirm === closeConfirm) closeActiveConfirm = null;
  }

  del.addEventListener("click", (event) => {
    event.stopPropagation(); // opening the prompt shouldn't toggle the card
    openConfirm();
  });
  cancelBtn.addEventListener("click", () => {
    closeConfirm();
    del.focus();
  });
  confirmBtn.addEventListener("click", () => deleteSession(session.id));

  li.append(content, confirmBar);
  return li;
}

// One row in the expanded tab list: a button that opens that single tab.
function buildTabItem(tab) {
  const item = document.createElement("li");
  item.className = "tab-item";

  const btn = document.createElement("button");
  btn.className = "tab-open";
  btn.type = "button";
  btn.title = tab.url; // full URL on hover

  const label = document.createElement("span");
  label.className = "tab-title";
  label.textContent = tab.title || tab.url;

  btn.append(faviconImg(tab.url), label);
  btn.addEventListener("click", (event) => {
    event.stopPropagation(); // don't toggle the card
    openSingleTab(tab.url, tab.title);
  });

  item.appendChild(btn);
  return item;
}

// The collapsed favicon preview: first MAX_FAVICONS icons + a "+N" badge.
function buildFavicons(tabs) {
  const wrap = document.createElement("div");
  wrap.className = "session-favicons";

  for (const tab of tabs.slice(0, MAX_FAVICONS)) {
    wrap.appendChild(faviconImg(tab.url));
  }

  const hidden = tabs.length - MAX_FAVICONS;
  if (hidden > 0) {
    const more = document.createElement("span");
    more.className = "favicon-more";
    more.textContent = `+${hidden}`;
    wrap.appendChild(more);
  }
  return wrap;
}

// Create one 16px favicon <img> from Chrome's favicon service.
function faviconImg(pageUrl) {
  const img = document.createElement("img");
  img.className = "favicon";
  img.width = 16;
  img.height = 16;
  img.alt = "";                      // decorative — screen readers skip it
  img.loading = "lazy";
  img.src = faviconURL(pageUrl, 32); // ask for 32px so it's crisp at 16px
  img.addEventListener("error", () => img.remove()); // drop broken images
  return img;
}

// ===========================================================================
// Favicons via Chrome's built-in favicon service
// ===========================================================================
//
// Chrome serves its cached favicons from a special URL INSIDE our extension
// origin, unlocked by the "favicon" permission in manifest.json:
//
//   chrome-extension://<our-extension-id>/_favicon/?pageUrl=<page>&size=32
//
// chrome.runtime.getURL("/_favicon/") builds the correct prefix (it knows our
// id). We add pageUrl (URL-encoded automatically by URLSearchParams) and size.
// If Chrome has no icon for a page it returns a neutral globe.
function faviconURL(pageUrl, size = 32) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(size));
  return url.toString();
}

// ===========================================================================
// Small inline-SVG helpers (fixed markup, no user data → innerHTML is safe)
// ===========================================================================
function chevronDownSVG() {
  return '<svg class="chevron-expand" viewBox="0 0 24 24" width="14" height="14" ' +
    'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>';
}
function chevronRightSVG() {
  return '<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" ' +
    'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>';
}
function pencilSVG() {
  return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" />' +
    '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>';
}

// ===========================================================================
// Small utilities
// ===========================================================================

function pluralizeTabs(count) {
  return `${count} tab${count === 1 ? "" : "s"}`;
}

// FEATURE 3 helper: "Session · Jul 1, 21:48" (24-hour, no year).
function autoName() {
  const stamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Session · ${stamp}`;
}

// Friendly "time ago"; falls back to an absolute date after a week.
function relativeTime(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours   = Math.round(minutes / 60);
  const days    = Math.round(hours / 24);

  if (seconds < 45) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24)   return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1)   return "yesterday";
  if (days < 7)     return `${days} days ago`;
  return formatDate(timestamp);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

let statusTimer;
function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = "";
    statusEl.classList.remove("error");
  }, 4000);
}

// ===========================================================================
// Start-up: wire events and draw the first render.
// ===========================================================================
document.addEventListener("DOMContentLoaded", () => {
  form.addEventListener("submit", handleSave);

  // Search: update the query and re-render on every keystroke. The input lives
  // in the static HTML (render only rebuilds the list), so it keeps its focus.
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    render();
  });

  // Open the bundled support page in a new tab. chrome.runtime.getURL turns
  // the relative path into our full chrome-extension://<id>/support.html URL.
  supportBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("support.html") });
    window.close();
  });

  updateSaveButtonCount();
  render();
});
