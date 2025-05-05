let token = null;
let scanResults = [];

// BetterStack logging:
function logEvent(eventType, message, additionalData = {}) {
  const timestampCDT = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const logData = {
    dt: timestampCDT,
    message: message,
    eventType: eventType,
    ...additionalData             
  };

  fetch('https://s1295227.eu-nbg-2.betterstackdata.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer wEbuDnATxe7BDzve3X6DZkEJ',
    },
    body: JSON.stringify(logData),
  })
  .then(response => {
    if (!response.ok) {
      console.error('Failed to log event to Better Stack:', response.statusText);
    } else {
      console.log('Log sent successfully:', logData);
    }
  })
  .catch(error => {
    console.error('Error sending log:', error);
  });
}


const connectBtn = document.getElementById("connect-btn");
const scanBtn = document.getElementById("scan-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const downloadBtn = document.getElementById("download-pdf-btn");
const newUserLink = document.getElementById("new-user-link");
const feedbackBtn = document.getElementById("feedback-btn");

document.addEventListener("DOMContentLoaded", () => {
  chrome.identity.getAuthToken({ interactive: false }, (existingToken) => {
    if (existingToken) {
      token = existingToken;
      updateUI(true);
    }
  });

  connectBtn.addEventListener("click", connectGmail);
  scanBtn.addEventListener("click", scanInbox);
  downloadBtn.addEventListener("click", downloadPDF);

  if (feedbackBtn) {
    feedbackBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("feedback.html") });
    });
  }
});

function connectGmail() {
  statusEl.textContent = "Connecting to Gmail...";
  
  chrome.identity.getAuthToken({ interactive: true }, (accessToken) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Connection failed. Please try again.";
      console.error("Auth error:", chrome.runtime.lastError);
      return;
    }
    
    token = accessToken;
    updateUI(true);
    statusEl.textContent = "Connected to Gmail!";
    logEvent('gmail_connection', 'Gmail account connected');
  });
}

async function scanInbox() {
  if (!token) {
    statusEl.textContent = "Please connect to Gmail first.";
    return;
  }

  statusEl.textContent = "Scanning your inbox...";
  scanBtn.disabled = true;

  try {
    const messages = await fetchGmailMessages(token);
    if (!messages.length) {
      statusEl.textContent = "No unread messages found.";
      return;
    }

    const results = await analyzeMessages(messages);
    console.log(results);

    displayResults(results);
    statusEl.textContent = `Scan complete! Found ${results.length} messages.`;
    
    const suspiciousCount = scanResults.filter(r => r.status !== 'Safe').length;
    const safeCount = scanResults.length - suspiciousCount;

    const phishingResults = scanResults.filter(r => r.status !== 'Safe');

    logEvent('scan_results', 'Scan completed', {
      summary: {
        total: scanResults.length,
        safe: safeCount,
        suspicious: suspiciousCount,
        suspiciousSubjects: scanResults
          .filter(r => r.status !== 'Safe')
          .map(r => r.subject),
      },
      result: phishingResults
    });

    const phishingEmails = results.filter(email => email.status === "Phishing");
    localStorage.setItem('phishingEmails', JSON.stringify(phishingEmails));    
    feedbackBtn.disabled = phishingEmails.length === 0;

  } catch (error) {
    console.error("Scan failed:", error);
    statusEl.textContent = "Scan failed. Please try again.";
  } finally {
    scanBtn.disabled = false;
  }
}

async function fetchGmailMessages(accessToken) {
  try {
    const listResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=is:unread",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listResponse.ok) {
      throw new Error(`API error: ${listResponse.status}`);
    }

    const { messages } = await listResponse.json();
    if (!messages || !messages.length) return [];

    const messagePromises = messages.map(msg => 
      fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(res => res.json())
    );

    return await Promise.all(messagePromises);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }
}

async function analyzeMessages(messages) {
  const results = [];
  
  for (const [index, message] of messages.entries()) {
    try {
      const subject = message.payload.headers.find(h => h.name === "Subject")?.value || "No Subject";
      const content = message.snippet || "";
      
      statusEl.textContent = `Analyzing ${index + 1}/${messages.length}: ${subject.substring(0, 30)}...`;

      const response = await fetch("https://phishnet-6beu.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, content })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      results.push({ subject, content, status: result.result, reasons: result.reasons });
    } catch (error) {
      console.error(`Failed to analyze message ${index}:`, error);
      results.push({ 
        subject: "Error", 
        content: "", 
        status: "Error", 
        error: error.message 
      });
    }
  }

  return results;
}

function displayResults(results) {
  scanResults = results;
  
  chrome.storage.local.set({ scanResults: results }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url?.includes("mail.google.com")) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updateLabels" })
          .catch(err => console.log("Content script not ready:", err));
      }
    });
  });

  resultsEl.innerHTML = results.map(result => `
    <div class="result-item ${result.status === "Phishing" ? "phishing" : "safe"}">
      <strong>${escapeHtml(result.subject)}</strong>
      <span class="status-badge">${result.status === "Phishing" ? "🔴 Phishing" : "🟢 Safe"}</span>
      ${result.error ? `<div class="error">${escapeHtml(result.error)}</div>` : ""}
    </div>
  `).join("");

  setTimeout(() => {
    if (feedbackBtn) {
      feedbackBtn.disabled = false; // enable feedback button
      feedbackBtn.classList.remove("disabled");
      feedbackBtn.offsetHeight;  // force reflow
      console.log('Feedback button enabled');
    }
  }, 0);

  downloadBtn.disabled = false;
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica");
  doc.setFontSize(18);
  doc.text("PhishNet Scan Report", 105, 15, { align: "center" });
  
  doc.setFontSize(12);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 25, { align: "center" });
  
  let yPos = 40;
  scanResults.forEach((result, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(result.status === "Phishing" ? 217 : 11, result.status === "Phishing" ? 48 : 128, result.status === "Phishing" ? 37 : 67);
    doc.text(`${result.status === "Phishing" ? "🔴" : "🟢"} ${result.subject.substring(0, 60)}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Status: ${result.status}`, 20, yPos + 7);
    
    if (result.content) {
      const contentLines = doc.splitTextToSize(result.content.substring(0, 200), 170);
      doc.text(contentLines, 20, yPos + 15);
    }
    
    yPos += result.content ? 30 : 20;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
  });

  doc.save("phishnet_scan_report.pdf");
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Update UI based on connection state
function updateUI(connected) {
  connectBtn.textContent = connected ? "Reconnect Gmail" : "Connect Gmail";
  scanBtn.disabled = !connected;
}
