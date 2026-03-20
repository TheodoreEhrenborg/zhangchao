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

## Installation

### Chrome / Chromium / Edge (Manifest V3)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this `browser-extension/` folder
4. The 涨潮 icon appears in your toolbar — click it to control the extension

### Firefox (Manifest V3, requires Firefox 109+)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Navigate to this folder and select `manifest.json`

For a permanent Firefox install, the extension needs to be signed via
[AMO](https://addons.mozilla.org/) or you can set `xpinstall.signatures.required = false`
in `about:config` on Firefox Developer Edition / Nightly.

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
