(function () {
  'use strict';

  document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");

    // Check storage for our login‑flag
    chrome.storage.local.get("isLoggedIn", ({ isLoggedIn }) => {
      if (isLoggedIn) {
        // Already signed in – redirect the popup to the real UI
        window.location.replace(chrome.runtime.getURL("popup.html"));
      } else {
        // Not signed in – wire up the Login button
        loginBtn.addEventListener("click", () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("mfa/register.html")
          });
        });
      }
    });
  });

})();
//# sourceMappingURL=script.bundle.js.map
