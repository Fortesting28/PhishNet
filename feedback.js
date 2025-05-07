function sendFeedbackLog(action, subject) {
  const timestampCDT = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  fetch('https://s1295227.eu-nbg-2.betterstackdata.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer wEbuDnATxe7BDzve3X6DZkEJ',
    },
    body: JSON.stringify({
      dt: timestampCDT,
      message: `User feedback: ${action} - ${subject}`,
      eventType: action,
      subject: subject
    }),
  }).then(res => {
    if (!res.ok) console.error("Failed to send feedback log");
  }).catch(console.error);
}

function markAsSafe(emailId) {
  chrome.storage.local.get("corrections", (data) => {
    const corrections = data.corrections || {};
    corrections[emailId] = "safe"; // Set corrected label
    chrome.storage.local.set({ corrections }, () => {
      console.log(`Email ${emailId} marked as safe.`);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
    const reportContainer = document.getElementById("feedback-container");
  
    chrome.storage.local.get("scanResults", (data) => {
      const results = data.scanResults || [];
  
      if (!results.length) {
        reportContainer.innerHTML = "<p>No scan results found.</p>";
        return;
      }
  
      const phishingResults = results.filter(r => r.status === "Phishing");
  
      if (!phishingResults.length) {
        reportContainer.innerHTML = "<p>Good news! No phishing emails were detected.</p>";
        return;
      }
  
      // phishing email details and reasons
      reportContainer.innerHTML = phishingResults.map((result, index) => `
        <div class="report-item" id="report-item-${index}">
        <h3>${escapeHtml(result.subject)}</h3>
        <p><strong>Status:</strong> 🔴 Phishing</p>
        <p><strong>Reason:</strong> ${escapeHtml(result.reasons || "No specific reason provided.")}</p>

    ${result.error ? `<p class="error">Error: ${escapeHtml(result.error)}</p>` : ""}
    <button class="feedback-btn false-positive-btn" data-index="${index}" data-action="falsePositive">Not Phishing</button>
    <button class="feedback-btn confirm-phishing-btn" data-index="${index}" data-action="confirmPhishing">Confirm Phishing</button>
  </div>
`).join("");

reportContainer.addEventListener("click", (event) => {
  if (!event.target.matches(".feedback-btn")) return;

  const index = event.target.getAttribute("data-index");
  const action = event.target.getAttribute("data-action");
  const subject = phishingResults[index]?.subject || "Unknown";

  if (action === "falsePositive") {
    console.log(`User marked "${subject}" as a false positive.`);
    sendFeedbackLog("false_positive", subject);
    const emailId = phishingResults[index]?.id;
    if (emailId) markAsSafe(emailId);
  } else if (action === "confirmPhishing") {
    console.log(`User confirmed "${subject}" as phishing.`);
    sendFeedbackLog("confirmed_phishing", subject);
  }

  // Optional: Disable buttons after feedback
  event.target.parentElement.querySelectorAll(".feedback-btn").forEach(btn => btn.disabled = true);
      });
    });
  });
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
    