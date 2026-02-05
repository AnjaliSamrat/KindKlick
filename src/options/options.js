import { getSettings, setSettings, setPinHash, sha256Hex, verifyPin } from '../shared/storage.js';

function parseDomainLines(text) {
  return (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean)
    .filter((d) => !d.includes('://'));
}

function el(id) {
  return document.getElementById(id);
}

function showStatus(msg, ms = 1500) {
  const s = el('status');
  s.textContent = msg;
  if (ms) setTimeout(() => (s.textContent = ''), ms);
}

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

async function requirePinIfSet() {
  const settings = await getSettings();
  if (!settings.pinHash) return true;

  const pin = prompt('Enter Parent PIN');
  if (!pin) return false;
  const ok = await verifyPin(pin);
  if (!ok) alert('Incorrect PIN');
  return ok;
}

function renderCategories(settings) {
  const container = el('categories');
  container.innerHTML = '';

  const enabled = settings.enabledCategories || {};
  for (const categoryName of Object.keys(enabled)) {
    const row = document.createElement('label');
    row.className = 'row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.category = categoryName;
    cb.checked = enabled[categoryName] !== false;

    const span = document.createElement('span');
    span.textContent = categoryName;

    row.appendChild(cb);
    row.appendChild(span);
    container.appendChild(row);
  }
}

function renderRequests(settings) {
  const container = el('requests');
  container.innerHTML = '';

  const requests = settings.accessRequests || [];
  if (requests.length === 0) {
    container.textContent = 'No requests yet.';
    return;
  }

  for (const r of requests) {
    const item = document.createElement('div');
    item.className = 'item';

    const top = document.createElement('div');
    top.className = 'top';

    const title = document.createElement('div');
    title.textContent = r.domain || r.url || 'Unknown';

    const ts = document.createElement('div');
    ts.className = 'meta';
    ts.textContent = formatTs(r.ts);

    top.appendChild(title);
    top.appendChild(ts);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `Category: ${r.category || 'Unknown'}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const approve10 = document.createElement('button');
    approve10.className = 'ok';
    approve10.textContent = 'Allow 10 min';
    approve10.onclick = async () => {
      if (!(await requirePinIfSet())) return;
      await chrome.runtime.sendMessage({
        type: 'APPROVE_DOMAIN',
        payload: { domain: r.domain, durationMinutes: 10, mode: 'temporary' }
      });
      showStatus('Approved for 10 minutes');
    };

    const approve60 = document.createElement('button');
    approve60.className = 'ok';
    approve60.textContent = 'Allow 1 hour';
    approve60.onclick = async () => {
      if (!(await requirePinIfSet())) return;
      await chrome.runtime.sendMessage({
        type: 'APPROVE_DOMAIN',
        payload: { domain: r.domain, durationMinutes: 60, mode: 'temporary' }
      });
      showStatus('Approved for 1 hour');
    };

    const approveAlways = document.createElement('button');
    approveAlways.className = 'ok';
    approveAlways.textContent = 'Always allow';
    approveAlways.onclick = async () => {
      if (!(await requirePinIfSet())) return;
      await chrome.runtime.sendMessage({
        type: 'APPROVE_DOMAIN',
        payload: { domain: r.domain, mode: 'always', durationMinutes: 0 }
      });
      showStatus('Approved (always)');
    };

    actions.appendChild(approve10);
    actions.appendChild(approve60);
    actions.appendChild(approveAlways);

    item.appendChild(top);
    item.appendChild(meta);
    item.appendChild(actions);
    container.appendChild(item);
  }
}

async function load() {
  const settings = await getSettings();

  el('enabled').checked = !!settings.enabled;
  el('profile').value = settings.profile || 'preteen';
  el('safeSearch').checked = !!settings.safeSearch?.enabled;

  el('allowList').value = (settings.allowList || []).join('\n');
  el('blockList').value = (settings.blockList || []).join('\n');

  renderCategories(settings);
  renderRequests(settings);
}

el('savePin').addEventListener('click', async () => {
  const pin = el('pin').value.trim();
  const pin2 = el('pin2').value.trim();

  if (pin.length < 4) {
    alert('PIN must be at least 4 digits/characters.');
    return;
  }

  if (pin !== pin2) {
    alert('PINs do not match.');
    return;
  }

  const hash = await sha256Hex(pin);
  await setPinHash(hash);
  el('pin').value = '';
  el('pin2').value = '';
  showStatus('PIN saved');
});

el('save').addEventListener('click', async () => {
  if (!(await requirePinIfSet())) return;

  const current = await getSettings();

  const enabledCategories = { ...(current.enabledCategories || {}) };
  for (const input of Array.from(document.querySelectorAll('input[type="checkbox"][data-category]'))) {
    const name = input.dataset.category;
    enabledCategories[name] = input.checked;
  }

  const next = {
    enabled: el('enabled').checked,
    profile: el('profile').value,
    safeSearch: { ...(current.safeSearch || {}), enabled: el('safeSearch').checked },
    allowList: parseDomainLines(el('allowList').value),
    blockList: parseDomainLines(el('blockList').value),
    enabledCategories
  };

  await setSettings(next);
  showStatus('Saved');
  await load();
});

load();
