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
