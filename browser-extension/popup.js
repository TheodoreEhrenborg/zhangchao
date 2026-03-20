/* Zhangchao popup script */

async function getStorage(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}
async function setStorage(obj) {
  return new Promise(resolve => chrome.storage.sync.set(obj, resolve));
}

// ── Mode buttons ──────────────────────────────────────────────────────────

function setActiveModeBtn(mode) {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const mode = btn.dataset.mode;
    await setStorage({ displayMode: mode });
    setActiveModeBtn(mode);
  });
});

// ── Current site & blacklist toggle ──────────────────────────────────────

let currentHost = '';

async function getCurrentHost() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        const url = new URL(tabs[0].url);
        resolve(url.hostname);
      } catch {
        resolve('');
      }
    });
  });
}

async function renderSiteSection(blacklist) {
  const hostEl     = document.getElementById('current-host');
  const statusEl   = document.getElementById('site-status');
  const toggleBtn  = document.getElementById('toggle-site-btn');

  hostEl.textContent = currentHost || '(unknown)';

  if (!currentHost) {
    toggleBtn.style.display = 'none';
    return;
  }

  const blocked = blacklist.some(d => {
    const domain = d.trim().toLowerCase();
    return domain && (currentHost === domain || currentHost.endsWith('.' + domain));
  });

  statusEl.innerHTML = blocked
    ? '<span class="status-badge blocked">Blocked</span>'
    : '<span class="status-badge active">Active</span>';

  toggleBtn.textContent = blocked ? 'Remove' : 'Block';
  toggleBtn.className   = blocked ? 'small action' : 'small danger';

  toggleBtn.onclick = async () => {
    const result  = await getStorage('blacklist');
    let list = result.blacklist || [];
    if (blocked) {
      list = list.filter(d => d.trim().toLowerCase() !== currentHost);
    } else {
      if (!list.includes(currentHost)) list.push(currentHost);
    }
    await setStorage({ blacklist: list });
    renderBlacklist(list);
    renderSiteSection(list);
  };
}

// ── Blacklist list rendering ──────────────────────────────────────────────

function renderBlacklist(list) {
  const ul    = document.getElementById('blacklist-items');
  const empty = document.getElementById('blacklist-empty');
  ul.innerHTML = '';
  if (list.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  for (const domain of list) {
    const li  = document.createElement('li');
    li.textContent = domain;
    const rm = document.createElement('button');
    rm.className   = 'small danger';
    rm.textContent = '✕';
    rm.style.padding = '2px 7px';
    rm.addEventListener('click', async () => {
      const r2 = await getStorage('blacklist');
      const newList = (r2.blacklist || []).filter(d => d !== domain);
      await setStorage({ blacklist: newList });
      renderBlacklist(newList);
      renderSiteSection(newList);
    });
    li.appendChild(rm);
    ul.appendChild(li);
  }
}

// ── Add domain manually ───────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', async () => {
  const input = document.getElementById('add-input');
  const value = input.value.trim().toLowerCase();
  if (!value) return;
  const result = await getStorage('blacklist');
  const list   = result.blacklist || [];
  if (!list.includes(value)) list.push(value);
  await setStorage({ blacklist: list });
  input.value = '';
  renderBlacklist(list);
  renderSiteSection(list);
});

document.getElementById('add-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-btn').click();
});

// ── Initialise ────────────────────────────────────────────────────────────

(async () => {
  const result = await getStorage(['displayMode', 'blacklist']);
  const mode   = result.displayMode || 'chinese';
  const list   = result.blacklist   || [];

  setActiveModeBtn(mode);
  renderBlacklist(list);

  currentHost = await getCurrentHost();
  renderSiteSection(list);
})();
