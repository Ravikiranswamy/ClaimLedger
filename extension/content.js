// ClaimLedger Chrome Extension — Content Script (Manifest V3)

// Optional listener for programmatic messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const text = window.getSelection().toString().trim();
    sendResponse({ text });
  }
  return true;
});

