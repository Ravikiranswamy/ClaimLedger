// ClaimLedger Chrome Extension — Popup Controller (Manifest V3)

const DEFAULT_BACKEND_URL = 'http://localhost:8080';

const SCENARIOS = {
  outdated: {
    text: 'Get Nexora Pro today for ₹799 per month! Complete enterprise AI brand compliance and automated claim verification across all digital channels.',
    campaign: ''
  },
  master: {
    text: 'Nexora Pro is officially priced at ₹999 per user per month billed annually, backed by enterprise-grade brand governance.',
    campaign: ''
  },
  diwali: {
    text: 'Celebrate Diwali with Nexora Pro at just ₹799 per user per month under our official festive campaign. Limited-time enterprise pricing approved under DIWALI_SPECIAL.',
    campaign: 'DIWALI_SPECIAL'
  },
  expired: {
    text: 'Get Nexora Pro for just ₹699 per user per month under our summer flash deal — act now before the sale ends!',
    campaign: 'SUMMER_FLASH_2025'
  }
};

// DOM Elements
const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');
const authSection = document.getElementById('auth-section');
const authLoggedOut = document.getElementById('auth-logged-out');
const authLoggedIn = document.getElementById('auth-logged-in');
const userRoleBadge = document.getElementById('user-role-badge');
const userEmailText = document.getElementById('user-email-text');
const btnSignOut = document.getElementById('btn-sign-out');

const btnDemoCreator = document.getElementById('btn-demo-creator');
const btnDemoAdmin = document.getElementById('btn-demo-admin');
const btnCustomLogin = document.getElementById('btn-custom-login');
const inputApiUrl = document.getElementById('api-url');
const inputLoginEmail = document.getElementById('login-email');
const inputLoginPassword = document.getElementById('login-password');

const claimTextarea = document.getElementById('claim-text');
const btnCaptureSelection = document.getElementById('btn-capture-selection');
const selectMode = document.getElementById('select-mode');
const inputCampaign = document.getElementById('input-campaign');
const btnVerify = document.getElementById('btn-verify');
const btnVerifyText = document.getElementById('btn-verify-text');
const btnVerifySpinner = document.getElementById('btn-verify-spinner');

const noticeBox = document.getElementById('notice-box');
const resultsSection = document.getElementById('results-section');
const resultsBanner = document.getElementById('results-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerSummary = document.getElementById('banner-summary');
const metricLatency = document.getElementById('metric-latency');
const metricViolations = document.getElementById('metric-violations');
const metricVerified = document.getElementById('metric-verified');
const metricConflicts = document.getElementById('metric-conflicts');
const findingsCount = document.getElementById('findings-count');
const findingsList = document.getElementById('findings-list');

// State
let backendUrl = DEFAULT_BACKEND_URL;
let authToken = null;
let currentUser = null;

// Initialize Popup
document.addEventListener('DOMContentLoaded', async () => {
  // Clear any extension action badge
  chrome.action.setBadgeText({ text: '' });

  // Load saved state from storage
  chrome.storage.local.get(['backendUrl', 'authToken', 'currentUser', 'pendingVerificationText', 'savedText', 'savedCampaign'], (data) => {
    if (data.backendUrl) {
      backendUrl = data.backendUrl;
      inputApiUrl.value = backendUrl;
    }
    if (data.authToken && data.currentUser) {
      authToken = data.authToken;
      currentUser = data.currentUser;
      setAuthedState(currentUser);
    } else {
      setUnauthedState();
    }

    // Check for pending text from context menu
    if (data.pendingVerificationText) {
      claimTextarea.value = data.pendingVerificationText;
      chrome.storage.local.remove(['pendingVerificationText']);
    } else if (data.savedText) {
      claimTextarea.value = data.savedText;
    }

    if (data.savedCampaign) {
      inputCampaign.value = data.savedCampaign;
    }

    checkBackendHealth();
  });

  setupEventListeners();
});

function setupEventListeners() {
  // Scenario chips
  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const scenarioKey = btn.getAttribute('data-scenario');
      const sc = SCENARIOS[scenarioKey];
      if (sc) {
        claimTextarea.value = sc.text;
        inputCampaign.value = sc.campaign;
        saveDraftState();
        showNotice(`Loaded preset: ${btn.textContent.trim()}`, 'info', 2000);
      }
    });
  });

  // Capture selection from active tab
  btnCaptureSelection.addEventListener('click', captureSelectionFromActiveTab);

  // Endpoint switches
  const btnSetLocal = document.getElementById('btn-set-local');
  const btnSetRender = document.getElementById('btn-set-render');
  if (btnSetLocal) {
    btnSetLocal.addEventListener('click', () => {
      inputApiUrl.value = 'http://localhost:8080';
      backendUrl = 'http://localhost:8080';
      chrome.storage.local.set({ backendUrl });
      checkBackendHealth();
      showNotice('Switched backend to Localhost (8080)', 'info', 2000);
    });
  }
  if (btnSetRender) {
    btnSetRender.addEventListener('click', () => {
      inputApiUrl.value = 'https://claimledger-backend-miox.onrender.com';
      backendUrl = 'https://claimledger-backend-miox.onrender.com';
      chrome.storage.local.set({ backendUrl });
      checkBackendHealth();
      showNotice('Switched backend to Live Render Cloud', 'info', 2000);
    });
  }

  // Demo Login buttons
  btnDemoCreator.addEventListener('click', () => login('creator@nexora.com', 'Demo@1234'));
  btnDemoAdmin.addEventListener('click', () => login('admin@nexora.com', 'Demo@1234'));

  // Custom login
  btnCustomLogin.addEventListener('click', () => {
    backendUrl = (inputApiUrl.value || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
    chrome.storage.local.set({ backendUrl });
    const email = inputLoginEmail.value.trim();
    const password = inputLoginPassword.value;
    if (!email || !password) {
      showNotice('Please enter email and password', 'error');
      return;
    }
    login(email, password);
  });

  // Sign out
  btnSignOut.addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    chrome.storage.local.remove(['authToken', 'currentUser'], () => {
      setUnauthedState();
      showNotice('Signed out', 'info', 2000);
    });
  });

  // Verify button
  btnVerify.addEventListener('click', runPreFlightCheck);

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  claimTextarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runPreFlightCheck();
    }
  });

  // Auto-save draft
  claimTextarea.addEventListener('input', saveDraftState);
  inputCampaign.addEventListener('input', saveDraftState);
}

function saveDraftState() {
  chrome.storage.local.set({
    savedText: claimTextarea.value,
    savedCampaign: inputCampaign.value.trim().toUpperCase()
  });
}

async function captureSelectionFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showNotice('No active tab found', 'error');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = results && results[0] && results[0].result ? results[0].result.trim() : '';
    if (selectedText) {
      claimTextarea.value = selectedText;
      saveDraftState();
      showNotice(`Captured ${selectedText.length} characters from page!`, 'success', 2500);
    } else {
      showNotice('No text selected on current webpage. Highlight text first!', 'info', 3000);
    }
  } catch (err) {
    console.warn('Selection capture failed:', err);
    showNotice('Cannot read page selection (restricted page or script blocked).', 'error', 3000);
  }
}

async function checkBackendHealth() {
  try {
    const res = await fetch(`${backendUrl}/api/health`, { method: 'GET' });
    if (res.ok) {
      if (authToken) {
        setConnectionStatus('online', 'Connected');
      } else {
        setConnectionStatus('amber', 'Sign-in Needed');
      }
    } else {
      setConnectionStatus('red', 'Backend Error');
    }
  } catch {
    setConnectionStatus('red', 'Backend Offline');
  }
}

function setConnectionStatus(type, label) {
  connDot.className = 'dot';
  if (type === 'online') {
    connDot.classList.add('dot-green');
  } else if (type === 'amber') {
    connDot.classList.add('dot-amber');
  } else {
    connDot.classList.add('dot-red');
  }
  connText.textContent = label;
}

function setAuthedState(user) {
  authLoggedOut.classList.add('hidden');
  authLoggedIn.classList.remove('hidden');
  userRoleBadge.textContent = user.role || 'USER';
  userEmailText.textContent = user.email || 'user';
  setConnectionStatus('online', 'Ready');
}

function setUnauthedState() {
  authLoggedIn.classList.add('hidden');
  authLoggedOut.classList.remove('hidden');
  setConnectionStatus('amber', 'Auth Needed');
}

async function login(email, password) {
  setLoading(true, 'Signing in...');
  hideNotice();

  try {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Login failed');
    }

    authToken = json.data.token;
    currentUser = json.data.user;

    chrome.storage.local.set({
      authToken,
      currentUser,
      backendUrl
    }, () => {
      setAuthedState(currentUser);
      showNotice(`Signed in as ${currentUser.name || currentUser.email}`, 'success', 2500);
    });
  } catch (err) {
    showNotice(`Authentication failed: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

async function runPreFlightCheck() {
  const text = claimTextarea.value.trim();
  if (!text) {
    showNotice('Please enter or capture some text to verify', 'error');
    claimTextarea.focus();
    return;
  }

  // Ensure authenticated
  if (!authToken) {
    showNotice('Please sign in or select a Demo account first', 'error');
    return;
  }

  const mode = selectMode.value;
  const campaignCode = inputCampaign.value.trim().toUpperCase() || null;

  setLoading(true, `Analyzing (${mode === 'LIGHTWEIGHT' ? 'Fast' : 'Deep'})...`);
  hideNotice();
  resultsSection.classList.add('hidden');

  try {
    const response = await fetch(`${backendUrl}/api/preflight/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        text,
        mode,
        campaignCode,
        departmentId: null
      })
    });

    if (response.status === 401 || response.status === 403) {
      authToken = null;
      setUnauthedState();
      throw new Error('Session expired or unauthorized. Please re-authenticate.');
    }

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Pre-flight check failed');
    }

    renderResults(json.data);
  } catch (err) {
    showNotice(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

function renderResults(data) {
  resultsSection.classList.remove('hidden');

  // Metrics
  metricLatency.textContent = `${data.latencyMs || 0}ms`;
  metricViolations.textContent = data.violations || 0;
  metricVerified.textContent = data.verified || 0;
  metricConflicts.textContent = data.conflicts || 0;

  // Banner
  resultsBanner.className = 'results-banner';
  if (data.compliant) {
    resultsBanner.classList.add('banner-compliant');
    bannerTitle.textContent = '✅ VERIFIED COMPLIANT';
    bannerSummary.textContent = data.summary || 'All claims match authoritative records and active policies.';
  } else {
    resultsBanner.classList.add('banner-violations');
    bannerTitle.textContent = `🚨 ${data.violations} VIOLATION(S) DETECTED`;
    bannerSummary.textContent = data.summary || 'Content violates enterprise brand policies or master price records.';
  }

  // Findings list
  const claims = data.claims || [];
  findingsCount.textContent = `${claims.length} claim${claims.length === 1 ? '' : 's'}`;
  findingsList.innerHTML = '';

  if (claims.length === 0) {
    findingsList.innerHTML = '<div style="padding: 10px; color: #64748b; font-size: 11px; text-align: center;">No verifiable claims extracted from the submitted copy.</div>';
    return;
  }

  claims.forEach(c => {
    const card = document.createElement('div');
    card.className = 'finding-card';

    const statusBadgeClass =
      c.status === 'VIOLATION' ? 'badge-violation' :
      c.status === 'VERIFIED' ? 'badge-verified' :
      c.status === 'CONFLICT' ? 'badge-conflict' : 'badge-unverified';

    card.innerHTML = `
      <div class="finding-top">
        <span class="badge-status ${statusBadgeClass}">${c.status}</span>
        <span class="finding-claim-type">${c.claimType || 'GENERAL'}</span>
      </div>
      <div class="finding-text">"${escapeHtml(c.claimText)}"</div>
      ${c.explanation ? `<div class="finding-reason">${escapeHtml(c.explanation)}</div>` : ''}
      ${c.suggestedCorrection ? `<div class="finding-correction">💡 Suggestion: ${escapeHtml(c.suggestedCorrection)}</div>` : ''}
      ${c.authoritativeSource ? `<div class="finding-source">Source: ${escapeHtml(c.authoritativeSource)}</div>` : ''}
    `;

    findingsList.appendChild(card);
  });

  // Scroll down to results smoothly
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setLoading(isLoading, label) {
  if (isLoading) {
    btnVerify.disabled = true;
    btnVerifySpinner.classList.remove('hidden');
    btnVerifyText.textContent = label || 'Verifying...';
  } else {
    btnVerify.disabled = false;
    btnVerifySpinner.classList.add('hidden');
    btnVerifyText.textContent = 'Verify Content';
  }
}

function showNotice(msg, type = 'info', autoDismissMs = 0) {
  noticeBox.className = `notice-box notice-${type}`;
  noticeBox.textContent = msg;
  noticeBox.classList.remove('hidden');

  if (autoDismissMs > 0) {
    setTimeout(hideNotice, autoDismissMs);
  }
}

function hideNotice() {
  noticeBox.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

