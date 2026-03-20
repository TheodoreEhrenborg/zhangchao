/**
 * Zhangchao browser extension — content script
 *
 * Replicates the logic of zhangchao.el:
 *  - Replaces English words with Chinese characters or Pinyin
 *  - Skips ALL-CAPS words (likely acronyms)
 *  - Shows a tooltip with pinyin + English when hovering over a replaced word
 *  - Respects a user-configurable blacklist of hostnames
 *  - Reacts to mode changes (chinese / pinyin / off) from the popup in real time
 */

(function () {
  if (window.__zhangchaoLoaded) return;
  window.__zhangchaoLoaded = true;

  // ── State ──────────────────────────────────────────────────────────────────

  let displayMode = 'chinese'; // 'chinese' | 'pinyin' | 'off'
  let wordMap = {};            // englishLower → { chinese, pinyin }
  let wordRegex = null;
  let vocabLoaded = false;
  let domProcessed = false;
  let domObserver = null;

  // ── Vocabulary loading ─────────────────────────────────────────────────────

  async function loadVocabulary() {
    const url = chrome.runtime.getURL('hsk1_v3.csv');
    const response = await fetch(url);
    const text = await response.text();
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      // Format: chinese,pinyin,english1;english2;...
      // Use indexOf to avoid splitting on commas inside the English field
      const first = line.indexOf(',');
      const second = line.indexOf(',', first + 1);
      if (first === -1 || second === -1) continue;
      const chinese = line.slice(0, first).trim();
      const pinyin  = line.slice(first + 1, second).trim();
      const englishField = line.slice(second + 1).trim();
      for (const eng of englishField.split(';')) {
        const engLower = eng.trim().toLowerCase();
        if (engLower) {
          wordMap[engLower] = { chinese, pinyin };
        }
      }
    }
    // Sort by length descending so longer phrases match before shorter ones
    const sorted = Object.keys(wordMap).sort((a, b) => b.length - a.length);
    const escaped = sorted.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    wordRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    vocabLoaded = true;
  }

  // ── Case-sensitivity rules (mirrors the elisp logic) ──────────────────────

  function shouldReplace(word) {
    if (!wordMap[word.toLowerCase()]) return false;
    // Skip ALL-CAPS words longer than one character (e.g. acronyms like "HTML")
    if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return false;
    return true;
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  let tooltip = null;

  function ensureTooltip() {
    if (tooltip) return;
    tooltip = document.createElement('div');
    tooltip.id = 'zhangchao-tooltip';
    Object.assign(tooltip.style, {
      position:      'fixed',
      background:    'rgba(28, 28, 28, 0.96)',
      color:         '#f0f0f0',
      padding:       '7px 13px',
      borderRadius:  '7px',
      fontSize:      '13px',
      lineHeight:    '1.7',
      pointerEvents: 'none',
      zIndex:        '2147483647',
      display:       'none',
      boxShadow:     '0 3px 12px rgba(0,0,0,0.5)',
      fontFamily:    'system-ui, sans-serif',
      maxWidth:      '280px',
      whiteSpace:    'nowrap',
    });
    document.body.appendChild(tooltip);

    document.addEventListener('mouseover', (e) => {
      const el = e.target && e.target.closest && e.target.closest('.zhangchao-word');
      if (el) {
        const { pinyin, english, original } = el.dataset;
        tooltip.innerHTML =
          `<span style="font-size:16px;font-weight:600">${pinyin}</span>` +
          `<span style="color:#bbb;margin-left:8px">·</span>` +
          `<span style="margin-left:8px">${escapeHtml(original)}</span>` +
          (english !== original.toLowerCase()
            ? `<span style="color:#999;margin-left:4px">(${escapeHtml(english)})</span>`
            : '');
        tooltip.style.display = 'block';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (tooltip.style.display === 'none') return;
      let x = e.clientX + 14;
      let y = e.clientY + 14;
      if (x + 290 > window.innerWidth)  x = e.clientX - 290;
      if (y + 60  > window.innerHeight) y = e.clientY - 60;
      tooltip.style.left = x + 'px';
      tooltip.style.top  = y + 'px';
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target && e.target.closest && e.target.closest('.zhangchao-word')) {
        tooltip.style.display = 'none';
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ── DOM processing ─────────────────────────────────────────────────────────

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'MATH', 'SVG',
  ]);

  function processSubtree(root) {
    if (!vocabLoaded || displayMode === 'off') return;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          const p = n.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
          if (p.isContentEditable) return NodeFilter.FILTER_REJECT;
          if (p.classList && p.classList.contains('zhangchao-word')) return NodeFilter.FILTER_REJECT;
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) replaceInTextNode(node);
  }

  function replaceInTextNode(node) {
    const text = node.nodeValue;
    const regex = new RegExp(wordRegex.source, 'gi');
    const matches = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (shouldReplace(m[0])) {
        matches.push({ index: m.index, word: m[0] });
      }
    }
    if (matches.length === 0) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const { index, word } of matches) {
      if (index > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, index)));
      }
      const { chinese, pinyin } = wordMap[word.toLowerCase()];
      const span = document.createElement('span');
      span.className = 'zhangchao-word';
      span.dataset.original = word;
      span.dataset.chinese   = chinese;
      span.dataset.pinyin    = pinyin;
      span.dataset.english   = word.toLowerCase();
      span.textContent = displayMode === 'chinese' ? chinese : pinyin;
      span.style.cssText = 'cursor:help;border-bottom:1px dotted rgba(120,120,120,0.6);';
      frag.appendChild(span);
      cursor = index + word.length;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  // ── Display mode updates ───────────────────────────────────────────────────

  function applyDisplayMode(mode) {
    const prev = displayMode;
    displayMode = mode;

    if (mode === 'off') {
      // Restore all spans to their original text
      for (const span of document.querySelectorAll('.zhangchao-word')) {
        span.replaceWith(document.createTextNode(span.dataset.original));
      }
      domProcessed = false;
      return;
    }

    if (domProcessed) {
      // Just swap the displayed text in existing spans
      for (const span of document.querySelectorAll('.zhangchao-word')) {
        span.textContent = mode === 'chinese' ? span.dataset.chinese : span.dataset.pinyin;
      }
    }

    if (!domProcessed) {
      ensureTooltip();
      processSubtree(document.body);
      startObserver();
      domProcessed = true;
    }
  }

  // ── MutationObserver for dynamic content ──────────────────────────────────

  function startObserver() {
    if (domObserver) return;
    domObserver = new MutationObserver((mutations) => {
      if (displayMode === 'off') return;
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processSubtree(node);
          }
        }
      }
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ── Blacklist check ────────────────────────────────────────────────────────

  async function isBlacklisted() {
    const hostname = window.location.hostname.toLowerCase();
    const result   = await chrome.storage.sync.get('blacklist');
    const list     = result.blacklist || [];
    return list.some(domain => {
      const d = domain.trim().toLowerCase();
      return d && (hostname === d || hostname.endsWith('.' + d));
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    if (await isBlacklisted()) return;

    await loadVocabulary();

    const result = await chrome.storage.sync.get('displayMode');
    const mode = result.displayMode || 'chinese';

    applyDisplayMode(mode);
  }

  // React to popup changes in real time
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.displayMode && vocabLoaded) {
      applyDisplayMode(changes.displayMode.newValue);
    }
  });

  init();
})();
