function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function el(id) {
  return document.getElementById(id);
}

const url = qs('url') || '';
const domain = qs('domain') || '';
const reason = qs('reason') || 'Blocked by rule';
const category = qs('category') || 'Unknown';

el('domain').textContent = domain;
el('category').textContent = category;
el('reason').textContent = `Blocked because: ${reason}`;

el('back').addEventListener('click', () => history.back());

el('request').addEventListener('click', async () => {
  el('status').textContent = 'Sending request…';
  try {
    await chrome.runtime.sendMessage({
      type: 'REQUEST_ACCESS',
      payload: { url, domain, category }
    });
    el('status').textContent = 'Request sent. Ask a parent to approve in Options.';
  } catch {
    el('status').textContent = 'Could not send request.';
  }
});
