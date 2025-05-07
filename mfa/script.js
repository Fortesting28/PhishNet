document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");

  // check storage for login‑flag
  chrome.storage.local.get("isLoggedIn", ({ isLoggedIn }) => {
    if (isLoggedIn) {
      // already signed in so redirect the popup to real UI
      window.location.replace(chrome.runtime.getURL("popup.html"));
    } else {
      // not signed in so load login button
      loginBtn.addEventListener("click", () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL("mfa/register.html")
        });
      });
    }
  });
});
