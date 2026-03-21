# 涨潮 Zhangchao — Browser Extension

A Chrome/Firefox extension that replicates the behaviour of `zhangchao.el`: it replaces
common English words with their HSK Level 1 Chinese character equivalents (or Pinyin) as
you browse the web.

## Features

- **Three display modes** — Chinese characters (汉), Pinyin (pīn), or Off
- **Hover tooltips** — mouse over any replaced word to see its Pinyin and original English
- **Case-aware matching** — mirrors the Emacs logic:
  - lowercase words → replaced
  - Title-case words → replaced
  - Single capital letters → replaced
  - ALL-CAPS words (acronyms) → **skipped**
- **User-configurable blacklist** — add any hostname to prevent the extension from running
  on that site (e.g. `mail.google.com`, `docs.google.com`)
- **Real-time mode switching** — change modes from the popup without reloading the page
- **Dynamic content support** — a `MutationObserver` handles text added after page load
  (SPAs, infinite scroll, etc.)

## Local installation (development / testing)

### Chrome / Chromium / Edge

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this `browser-extension/` folder
4. The 涨潮 icon appears in your toolbar — click it to control the extension

### Firefox (requires Firefox 109+)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Navigate to this folder and select `manifest.json`

> **Note:** Temporary add-ons are removed when Firefox restarts. For a permanent
> local install without store publishing, see the Firefox signing section below.

---

## Testing checklist

### In Chrome

- [ ] Load the unpacked extension (steps above)
- [ ] Visit a content-heavy page (e.g. a Wikipedia article) — common words like "love",
      "help", "north" should appear as Chinese characters
- [ ] Click the toolbar icon and switch to **Pinyin** — replaced words should change to
      romanised pinyin
- [ ] Switch to **Off** — original English text should be restored
- [ ] Hover over a replaced word — tooltip should show pinyin and the original English word
- [ ] Open the popup, add `mail.google.com` to the blacklist, navigate there — no
      replacements should occur
- [ ] Confirm ALL-CAPS strings like "HTML" or "URL" are not replaced
- [ ] Open browser DevTools console — confirm no errors are logged

### In Firefox

- [ ] Load the temporary add-on (steps above)
- [ ] Repeat all Chrome checks above
- [ ] Confirm the popup renders correctly (Firefox uses its own popup styling engine)
- [ ] Confirm that `chrome.*` APIs work — the extension uses the `chrome` namespace
      which Firefox supports as an alias for `browser.*` since Firefox 109

---

## Publishing

### Chrome Web Store

1. **Create a developer account** — go to the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and pay the one-time $5 registration fee if you haven't already.

2. **Package the extension** — zip the contents of `browser-extension/` (not the folder
   itself; the zip root should contain `manifest.json`):
   ```bash
   cd browser-extension
   zip -r ../zhangchao-chrome.zip .
   ```

3. **Create a new item** — click **Add new item** in the dashboard and upload
   `zhangchao-chrome.zip`.

4. **Fill in the store listing:**
   - Name: `涨潮 Zhangchao`
   - Short description (≤132 chars): *Replace English words with Chinese characters or Pinyin as you browse — hover for pinyin tooltips*
   - Category: Education
   - Language: English
   - Screenshots: at least one 1280×800 or 640×400 screenshot (required)
   - Privacy policy: required if you declare any permissions — `storage` and `activeTab`
     are used; a simple privacy policy stating no data is collected externally suffices

5. **Submit for review** — review typically takes a few days. The extension uses only
   `storage` and `activeTab` (no broad host permissions at runtime), which keeps the
   review scope minimal.

---

### Firefox Add-ons (AMO)

Firefox requires extensions to be **signed by Mozilla** before they can be installed
permanently by regular users.

#### Option A — Publish on addons.mozilla.org (recommended)

1. **Create a Firefox account** at [accounts.firefox.com](https://accounts.firefox.com)
   if you don't have one.

2. **Submit the extension** at [addons.mozilla.org/developers](https://addons.mozilla.org/en-US/developers/):
   - Click **Submit a New Add-on** → **On this site** (public listing)
   - Upload a zip of the `browser-extension/` folder (same zip as Chrome works)

3. **Fill in the listing:**
   - Name, summary, description, screenshots (at least one required)
   - Categories: Appearance + Education
   - The source code upload step is optional but recommended for open-source projects

4. **Automated validation** runs immediately; manual review follows (days to weeks for
   new add-ons). Once approved the extension is signed and publicly listed.

#### Option B — Self-distributed signed `.xpi` (no public listing)

Use Mozilla's [web-ext](https://github.com/mozilla/web-ext) tool to sign the extension
for self-distribution without a public AMO listing. Requires an AMO account and API key.

```bash
npm install -g web-ext

# Get API credentials from https://addons.mozilla.org/en-US/developers/addon/api/key/
web-ext sign \
  --source-dir ./browser-extension \
  --api-key $AMO_JWT_ISSUER \
  --api-secret $AMO_JWT_SECRET \
  --channel unlisted
```

This produces a signed `.xpi` file that users can install permanently via
**about:addons → Install Add-on From File**.

#### Option C — Firefox Developer Edition / Nightly (unsigned, dev only)

Set `xpinstall.signatures.required = false` in `about:config`. This bypasses signing
entirely but only works on Developer Edition and Nightly builds — not on release Firefox.

## Usage

Click the toolbar icon to open the popup:

| Control | Description |
|---------|-------------|
| **汉 Chinese** | Replace words with Chinese characters |
| **pīn Pinyin** | Replace words with Pinyin romanisation |
| **Aa Off** | Restore original English text |
| **Block / Remove** | Add or remove the current site from the blacklist |
| **Blacklist input** | Manually type a domain to block (e.g. `gmail.com`) |

Hover your mouse over any replaced word to see a tooltip showing the **Pinyin** and
the **original English** word.

## Vocabulary

Uses the same `hsk1_v3.csv` file as the Emacs mode — HSK 3.0 Level 1 vocabulary
(~400 entries) sourced from Wiktionary, licensed CC BY-SA 4.0.

## Recommended Blacklist

Sites where text replacement tends to cause confusion:

- `mail.google.com`
- `docs.google.com`
- `sheets.google.com`
- `github.com`
- `stackoverflow.com`
