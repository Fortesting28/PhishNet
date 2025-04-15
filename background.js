let isConnected = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📬 Received message:", message);

  if (message.action === "checkConnection") {
    sendResponse({ connected: isConnected });
    return;
  }

  if (message.action === "analyzeEmail") {
    analyzeEmail(message.subject, message.content)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Analysis failed:", error);
        sendResponse({ result: "Error", error: error.message });
      });
    return true;
  }
});

async function analyzeEmail(subject, content) {
  try {
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Analyzed "${subject.substring(0, 30)}..."`, result);
    return result;
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    return { result: "Error", error: error.message };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated");
  isConnected = false;
});

chrome.runtime.onConnect.addListener((port) => {
  console.log("Connected to port:", port.name);
  isConnected = true;
  
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected");
    isConnected = false;
  });
});
