// support.js — logic for the support page.
//
// The extension never processes payments itself. Each button just opens the
// Ko-fi page in a new tab; the amount (or membership tier) is chosen there.

"use strict";

// Each key matches the data-tier attribute of one button in support.html.
// Ko-fi can't deep-link exact amounts, so one-time goes to the main page
// (visitor picks the amount) and monthly goes to the membership tiers page.
const PAYMENT_LINKS = {
  once:    "https://ko-fi.com/janko765",
  monthly: "https://ko-fi.com/janko765/tiers",
};

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

// One delegated listener for the whole page instead of one per button:
// clicks bubble up from whatever was clicked, and we check whether it was
// (or was inside) a button that carries a data-tier attribute.
document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-tier]");
  if (!btn) return; // the click wasn't on a tier button

  const url = PAYMENT_LINKS[btn.dataset.tier];
  if (!url) return;

  // Open the payment page in a new tab. "noopener" prevents the opened page
  // from being able to script this one — good hygiene for external links.
  window.open(url, "_blank", "noopener");
});

// ---------------------------------------------------------------------------
// Supporter unlock
// ---------------------------------------------------------------------------
// Supporters receive a code via Ko-fi. Only the SHA-256 of the normalized
// code ships in this file, never the code itself. A correct code sets the
// supporterUnlock flag in chrome.storage.local; the background worker sees
// the change and starts the Auto-Snapshot alarm. This is honor-system-grade
// protection (the flag can be set by hand in DevTools) — a deliberate
// trade-off for an extension with no server.
const UNLOCK_KEY = "supporterUnlock";
const UNLOCK_HASH =
  "efaf9b40842502460e733a58f90d3ae58bdbd720882b1eef60cc059abd74362c";

const unlockFormWrap = document.getElementById("unlock-form-wrap");
const unlockForm     = document.getElementById("unlock-form");
const unlockInput    = document.getElementById("unlock-code");
const unlockDone     = document.getElementById("unlock-done");

// SHA-256 → lowercase hex string, via the built-in WebCrypto API.
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Swap the code form for the thank-you panel.
function showUnlocked() {
  unlockFormWrap.hidden = true;
  unlockDone.hidden = false;
}

unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // stay on this page instead of a form navigation

  // Trim + uppercase so stray spaces or lowercase typing can't fail a real
  // code. (UNLOCK_HASH was computed on this normalized form.)
  const code = unlockInput.value.trim().toUpperCase();
  if (!code) return;

  if ((await sha256Hex(code)) === UNLOCK_HASH) {
    await chrome.storage.local.set({
      [UNLOCK_KEY]: { unlocked: true, unlockedAt: Date.now() },
    });
    showUnlocked();
  } else {
    showNotice("Hmm, that code doesn't look right — check it and try again?");
    unlockInput.select();
  }
});

// If this browser is already unlocked, skip the form and show the thanks.
chrome.storage.local.get(UNLOCK_KEY).then((data) => {
  if (data[UNLOCK_KEY] && data[UNLOCK_KEY].unlocked) showUnlocked();
});
