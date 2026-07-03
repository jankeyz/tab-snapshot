// background.js — the Auto-Snapshot service worker (supporter perk).
//
// While unlocked, a chrome.alarms alarm fires every INTERVAL_MIN minutes and
// captures every tab in every normal window into a rolling buffer of the
// last MAX_AUTO snapshots, stored under AUTO_KEY. The popup renders that
// buffer as a read-only "Auto-snapshots" section.
//
// MV3 notes: alarms wake a dormant service worker, so dormancy is fine here.
// Alarms persist across browser restarts, but we still re-sync the alarm in
// onInstalled/onStartup — that picks up interval changes across versions and
// heals any lost alarm. Minimum alarm period is 30 seconds, so 5 minutes is
// well within limits.

"use strict";

const ALARM_NAME   = "auto-snapshot";
const INTERVAL_MIN = 5; // minutes between snapshots
const MAX_AUTO     = 5; // rolling buffer size (~25 minutes of history)
const AUTO_KEY     = "autoSnapshots";
const UNLOCK_KEY   = "supporterUnlock"; // written by support.js on unlock

async function isUnlocked() {
  const data = await chrome.storage.local.get(UNLOCK_KEY);
  return Boolean(data[UNLOCK_KEY] && data[UNLOCK_KEY].unlocked);
}

// Make the alarm state match the unlock state. chrome.alarms.create with an
// existing name just replaces the alarm, so calling this repeatedly is safe.
async function syncAlarm() {
  if (await isUnlocked()) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: INTERVAL_MIN });
  } else {
    chrome.alarms.clear(ALARM_NAME);
  }
}

// Capture all tabs of all normal windows into one snapshot entry, shaped
// exactly like a manual session so the popup can reuse its rendering.
async function takeAutoSnapshot() {
  // Guard against a stale alarm firing after the unlock flag was removed.
  if (!(await isUnlocked())) {
    chrome.alarms.clear(ALARM_NAME);
    return;
  }

  const tabs = (await chrome.tabs.query({ windowType: "normal" }))
    .map((tab) => ({ title: tab.title, url: tab.url }));
  if (tabs.length === 0) return;

  const data = await chrome.storage.local.get(AUTO_KEY);
  const snapshots = data[AUTO_KEY] || [];

  // Skip the write when nothing changed since the newest snapshot —
  // otherwise an idle browser would burn the whole buffer on identical
  // entries within 25 minutes.
  const urlKey = (list) => list.map((t) => t.url).join("\n");
  if (snapshots.length > 0 && urlKey(snapshots[0].tabs) === urlKey(tabs)) {
    return;
  }

  snapshots.unshift({
    id: crypto.randomUUID(),
    name: autoSnapshotName(),
    tabs,
    createdAt: Date.now(),
  });
  await chrome.storage.local.set({ [AUTO_KEY]: snapshots.slice(0, MAX_AUTO) });
}

// "Auto · Jul 3, 21:48" — same timestamp style as the popup's autoName().
function autoSnapshotName() {
  const stamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Auto · ${stamp}`;
}

// Listener registration must happen synchronously at the top level in MV3,
// or a re-awakened worker would miss the events that woke it.
chrome.runtime.onInstalled.addListener(syncAlarm);
chrome.runtime.onStartup.addListener(syncAlarm);

// Unlocking on the support page (or removing the flag) flips the alarm
// immediately — no runtime messaging needed.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[UNLOCK_KEY]) syncAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) takeAutoSnapshot();
});
