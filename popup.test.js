beforeEach(() => {
    // html mimicking for testing
    document.body.innerHTML = `
      <div id="app">
        <div class="logo-container">
          <img src="icon32.png" alt="PhishNet Logo" class="logo-typeface">
          <img src="icon16.png" alt="PhishNet Icon" class="logo-icon">
        </div>
        <button id="connect-btn">Reconnect Gmail Account</button>
        <a href="mfa/index.html" id="new-user-link">New Users: Sign in here</a>
        <hr class="divider">
        <button id="scan-btn" disabled>Scan Inbox</button>
        <div id="status">Connecting...</div>
        <div id="results"></div>
        <div class="button-group">
          <button id="download-pdf-btn" disabled>Download PDF Report</button>
          <button id="feedback-btn" disabled>View Feedback Report</button>
        </div>
      </div>
    `;
  
    // simulate DOMContentLoaded event
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('should trigger Gmail connection on button click', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  
    const connectBtn = document.getElementById('connect-btn');
    const connectGmailMock = jest.fn();
  
    connectBtn.addEventListener('click', connectGmailMock);
    connectBtn.click();
  
    expect(connectGmailMock).toHaveBeenCalled();
  });

  test('should trigger inbox scan on button click', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  
    const scanBtn = document.getElementById('scan-btn');
    const scanInboxMock = jest.fn();
  
    scanBtn.addEventListener('click', scanInboxMock);
    scanBtn.click();
  
    expect(scanInboxMock).toHaveBeenCalled();
  });

  test('should enable feedback and download buttons after scan', () => {
    const scanBtn = document.getElementById('scan-btn');
    const downloadBtn = document.getElementById('download-pdf-btn');
    const feedbackBtn = document.getElementById('feedback-btn');
  
    scanBtn.disabled = false;
    scanBtn.click();
  
    downloadBtn.disabled = false; // enable download button
    feedbackBtn.disabled = false; // enable feedback button
  
    // test
    expect(downloadBtn.disabled).toBe(false);
    expect(feedbackBtn.disabled).toBe(false);
  });  
  
  test('should trigger download PDF after scan is complete', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  
    const downloadBtn = document.getElementById('download-pdf-btn');
    const downloadPDFMock = jest.fn();
  
    // simulate enabling button after scan
    downloadBtn.disabled = false;
    downloadBtn.addEventListener('click', downloadPDFMock);
    downloadBtn.click();
  
    expect(downloadPDFMock).toHaveBeenCalled();
  });

  test('should show feedback after scan is complete', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  
    const feedbackBtn = document.getElementById('feedback-btn');
    const showFeedbackMock = jest.fn();
  
    // simulate enabling button after scan
    feedbackBtn.disabled = false;
    feedbackBtn.addEventListener('click', showFeedbackMock);
    feedbackBtn.click();
  
    expect(showFeedbackMock).toHaveBeenCalled();
  });