import { getSettings, recordAccessRequest, upsertApproval, clearExpiredApprovals } from '../shared/storage.js';
import { evaluateUrl, normalizeUrlForMatching, enforceSafeSearchIfNeeded } from '../shared/engine.js';

const BLOCKED_PAGE = chrome.runtime.getURL('src/blocked/blocked.html');

chrome.runtime.onInstalled.addListener(async () => {
  await clearExpiredApprovals();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm?.name === 'cleanupexpired') {
    await clearExpiredApprovals();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create('cleanupexpired', { periodInMinutes: 30 });
  await clearExpiredApprovals();
});

async function maybeHandleNavigation(tabId, rawUrl) {
  const url = normalizeUrlForMatching(rawUrl);
  if (!url) return;

  const settings = await getSettings();
  if (!settings?.enabled) return;

  const safeRedirect = enforceSafeSearchIfNeeded(url, settings);
  if (safeRedirect && safeRedirect !== url) {
    await chrome.tabs.update(tabId, { url: safeRedirect });
    return;
  }

  const verdict = evaluateUrl(url, settings);
  if (verdict.action !== 'block') return;

  const params = new URLSearchParams({
    url: url,
    domain: verdict.domain,
    reason: verdict.reason,
    category: verdict.category || 'Unknown',
    rule: verdict.rule || 'rule'
  });

  const target = `${BLOCKED_PAGE}?${params.toString()}`;

  try {
    await chrome.tabs.update(tabId, { url: target });
  } catch {
    // ignore
  }
}

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url) return;
  await maybeHandleNavigation(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  await maybeHandleNavigation(tabId, changeInfo.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== 'string') {
      sendResponse({ ok: false, error: 'Invalid message' });
      return;
    }

    if (message.type === 'REQUEST_ACCESS') {
      const { url, domain, category } = message.payload || {};
      await recordAccessRequest({ url, domain, category });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'APPROVE_DOMAIN') {
      const { domain, durationMinutes, mode } = message.payload || {};
      await upsertApproval({ domain, durationMinutes, mode });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'PING') {
      sendResponse({ ok: true, ts: Date.now() });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message type' });
  })();

  return true;
});
