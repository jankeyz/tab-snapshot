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
