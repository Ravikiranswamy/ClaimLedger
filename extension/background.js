// ClaimLedger Chrome Extension — Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Setup context menu on selection
  chrome.contextMenus.create({
    id: 'claimledger-verify-selection',
    title: 'Verify with ClaimLedger',
    contexts: ['selection']
  });

  // Set default settings if not yet present
  chrome.storage.local.get(['backendUrl', 'mode'], (data) => {
    if (!data.backendUrl) {
      chrome.storage.local.set({ backendUrl: 'http://localhost:8080' });
    }
    if (!data.mode) {
      chrome.storage.local.set({ mode: 'LIGHTWEIGHT' });
    }
  });

  console.log('ClaimLedger extension installed and context menu registered.');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'claimledger-verify-selection' && info.selectionText) {
    const text = info.selectionText.trim();
    chrome.storage.local.set({
      pendingVerificationText: text,
      pendingTimestamp: Date.now()
    }, () => {
      // Highlight badge to inform user
      chrome.action.setBadgeText({ text: 'CHECK' });
      chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });

      // Attempt to open popup programmatically (supported in newer Chrome versions)
      if (chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {
          // If popup cannot be opened directly from service worker, badge will notify user
        });
      }
    });
  }
});

