const STORAGE_KEY = 'kindklick.settings.v1';

export function defaultSettings() {
  return {
    enabled: true,
    profile: 'preteen',
    pinHash: null,
    allowList: [],
    blockList: [],
    approvals: {},
    safeSearch: {
      enabled: true,
      // youtube placeholder for stage 0
      youtubeRestrictedMode: false
    },
    enabledCategories: {
      Adult: true,
      Gambling: true,
      Drugs: true,
      Violence: true,
      SelfHarm: true
    },
    categoryLists: {
      Adult: ["example-adult.test"],
      Gambling: ["example-gambling.test"],
      Drugs: ["example-drugs.test"],
      Violence: ["example-violence.test"],
      SelfHarm: ["example-selfharm.test"]
    },
    accessRequests: []
  };
}

export async function getSettings() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const settings = result[STORAGE_KEY];
  if (!settings) {
    const defaults = defaultSettings();
    await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
    return defaults;
  }
  return settings;
}

export async function setSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function setPinHash(pinHash) {
  const current = await getSettings();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, pinHash } });
}

export async function recordAccessRequest({ url, domain, category }) {
  const current = await getSettings();
  const request = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    url: url || null,
    domain: domain || null,
    category: category || null,
    status: 'pending'
  };
  const accessRequests = [request, ...(current.accessRequests || [])].slice(0, 50);
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, accessRequests } });
  return request;
}

export async function upsertApproval({ domain, durationMinutes, mode }) {
  if (!domain) return;
  const minutes = Number(durationMinutes || 10);
  const expiresAt = mode === 'always' ? Date.now() + 1000 * 60 * 60 * 24 * 365 * 10 : Date.now() + minutes * 60 * 1000;

  const current = await getSettings();
  const approvals = { ...(current.approvals || {}) };
  approvals[domain.toLowerCase()] = {
    domain: domain.toLowerCase(),
    createdAt: Date.now(),
    expiresAt,
    mode: mode || 'temporary'
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, approvals } });
}

export async function clearExpiredApprovals() {
  const current = await getSettings();
  const approvals = { ...(current.approvals || {}) };

  let changed = false;
  for (const [domain, approval] of Object.entries(approvals)) {
    if (!approval?.expiresAt) continue;
    if (Date.now() >= approval.expiresAt) {
      delete approvals[domain];
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, approvals } });
  }
}

export async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin) {
  const settings = await getSettings();
  if (!settings.pinHash) return false;
  const hash = await sha256Hex(pin);
  return hash === settings.pinHash;
}
