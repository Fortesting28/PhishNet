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
  
      // Display phishing email details and reasons
      reportContainer.innerHTML = phishingResults.map((result, index) => `
        <div class="report-item" id="report-item-${index}">
        <h3>${escapeHtml(result.subject)}</h3>
        <p><strong>Status:</strong> 🔴 Phishing</p>
        <p><strong>Reason:</strong> ${escapeHtml(result.reasons || "No specific reason provided.")}</p>

    ${result.error ? `<p class="error">Error: ${escapeHtml(result.error)}</p>` : ""}
  </div>
`).join("");

    });
  });
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
    