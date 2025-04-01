console.log("PhishNet Content Script Loaded");

// Configuration
const CHECK_INTERVAL = 1500; // Check every 1.5 seconds for new emails
const MAX_RETRIES = 3; // Maximum attempts to add indicator to an email

// Track processed emails
const processedEmails = new Map();

function addPhishingIndicators() {
  console.log("🔍 Scanning emails...");

  chrome.storage.local.get("scanResults", (data) => {
    if (!data.scanResults) {
      console.warn("⚠️ No scan results found");
      return;
    }

    const scanResults = data.scanResults;
    
    // Updated Gmail selectors for better reliability
    const emailRows = document.querySelectorAll('tr.zA, div[role="main"] tr[role="row"]');

    emailRows.forEach((row) => {
      const emailId = row.getAttribute('data-legacy-thread-id') || row.id;
      if (!emailId || processedEmails.get(emailId) >= MAX_RETRIES) return;

      // Mark as processed or increment retry count
      processedEmails.set(emailId, (processedEmails.get(emailId) || 0) + 1);

      const subjectElement = row.querySelector('span.bog, span[data-legacy-subject-id]');
      if (!subjectElement) {
        console.warn("⚠️ Could not find subject element in row:", row);
        return;
      }

      const subject = subjectElement.textContent.replace(/^[🔴🟢]/, '').trim();
      console.log(`Checking email: "${subject}"`);

      const result = scanResults.find((email) => 
        email.subject.trim() === subject.trim()
      );
      
      if (!result) {
        console.warn(`⚠️ No stored result found for "${subject}"`);
        return;
      }

      const status = result.status.trim();
      console.log(`Adding label for "${subject}": ${status}`);

      // Remove existing indicators
      const existingLabels = subjectElement.querySelectorAll('.phishing-label');
      existingLabels.forEach(el => el.remove());

      // Create and insert new indicator
      const label = document.createElement("span");
      label.textContent = status === "Phishing" ? " 🔴" : " 🟢";
      label.className = "phishing-label";
      label.style.color = status === "Phishing" ? "#d32f2f" : "#0b8043";
      label.style.fontWeight = "bold";
      label.style.marginLeft = "6px";
      label.style.fontSize = "16px";
      label.style.verticalAlign = "middle";

      // Insert at beginning of subject
      subjectElement.insertBefore(label, subjectElement.firstChild);
      
      // For Gmail's hover preview
      const hoverSubject = row.querySelector('.bog span:not([data-legacy-subject-id])');
      if (hoverSubject && hoverSubject !== subjectElement) {
        const hoverLabel = label.cloneNode(true);
        hoverSubject.insertBefore(hoverLabel, hoverSubject.firstChild);
      }

      // Additional visual cue for phishing emails
      if (status === "Phishing") {
        row.style.borderLeft = "3px solid #d32f2f";
        row.style.backgroundColor = "rgba(255, 0, 0, 0.03)";
      }
    });
  });
}

// Enhanced mutation observer for Gmail's dynamic content
const observer = new MutationObserver((mutations) => {
  let shouldUpdate = false;
  
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      shouldUpdate = true;
    }
  });

  if (shouldUpdate) {
    addPhishingIndicators();
  }
});

// Initialize observer
observer.observe(document.body, { 
  childList: true, 
  subtree: true,
  attributes: false,
  characterData: false
});

// Periodic check as fallback
setInterval(addPhishingIndicators, CHECK_INTERVAL);

// Handle update requests
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updateLabels") {
    processedEmails.clear(); // Clear cache when we get new results
    addPhishingIndicators();
  }
});

console.log("🟢 Phishing indicators script initialized.");
