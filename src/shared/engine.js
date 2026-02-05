import { extractDomain } from './url.js';

export function normalizeUrlForMatching(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function evaluateUrl(url, settings) {
  const domain = extractDomain(url);
  if (!domain) {
    return { action: 'allow', domain: '', reason: 'invalid_url' };
  }

  const approvals = settings?.approvals || {};
  const approval = approvals[domain];
  if (approval && approval.expiresAt && Date.now() < approval.expiresAt) {
    return { action: 'allow', domain, reason: 'parent_approval', rule: 'approval' };
  }

  const allowList = new Set((settings?.allowList || []).map((d) => d.toLowerCase()));
  if (allowList.has(domain)) {
    return { action: 'allow', domain, reason: 'allow_list', rule: 'allowlist' };
  }

  const customBlockList = new Set((settings?.blockList || []).map((d) => d.toLowerCase()));
  if (customBlockList.has(domain)) {
    return {
      action: 'block',
      domain,
      reason: 'Custom blocklist',
      category: 'Custom',
      rule: 'custom_blocklist'
    };
  }

  const category = getCategoryForDomain(domain, settings?.categoryLists || {});
  if (category) {
    const enabledCategories = settings?.enabledCategories || {};
    const categoryEnabled = enabledCategories[category] !== false;
    if (categoryEnabled) {
      return {
        action: 'block',
        domain,
        reason: `${category} (Category rule)`,
        category,
        rule: 'category'
      };
    }
  }

  return { action: 'allow', domain, reason: 'no_rule' };
}

function getCategoryForDomain(domain, categoryLists) {
  for (const [categoryName, domains] of Object.entries(categoryLists || {})) {
    if (!Array.isArray(domains)) continue;
    if (domains.some((d) => (d || '').toLowerCase() === domain)) return categoryName;
  }
  return null;
}

export function enforceSafeSearchIfNeeded(url, settings) {
  if (!settings?.safeSearch?.enabled) return null;

  try {
    const u = new URL(url);

    // Google: safe=active
    if (u.hostname === 'www.google.com' || u.hostname.endsWith('.google.com')) {
      if (u.pathname === '/search' || u.pathname === '/') {
        if (u.searchParams.get('safe') !== 'active') {
          u.searchParams.set('safe', 'active');
          return u.toString();
        }
      }
    }

    // Bing: adlt=strict
    if (u.hostname === 'www.bing.com' || u.hostname.endsWith('.bing.com')) {
      if (u.pathname === '/search' || u.pathname === '/') {
        if (u.searchParams.get('adlt') !== 'strict') {
          u.searchParams.set('adlt', 'strict');
          return u.toString();
        }
      }
    }

    // YouTube Restricted Mode is non-trivial; stage-0 placeholder.
    return null;
  } catch {
    return null;
  }
}
