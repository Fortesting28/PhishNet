document.getElementById('loginBtn').addEventListener('click', function() {
    chrome.tabs.create({ url: 'mfa/register.html' });
  });
