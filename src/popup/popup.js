import { getSettings } from '../shared/storage.js';

function el(id) {
  return document.getElementById(id);
}

async function load() {
  const settings = await getSettings();
  el('enabled').textContent = settings.enabled ? 'On' : 'Off';
  el('profile').textContent = settings.profile || '—';
}

el('openOptions').addEventListener('click', async () => {
  await chrome.runtime.openOptionsPage();
});

load();
