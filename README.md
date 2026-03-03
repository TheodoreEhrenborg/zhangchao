# 涨潮 (zhāng cháo)

English-Chinese Mode - A minor mode for Emacs that replaces English words with Chinese characters or Pinyin.

> "La mer monte." - Alexandre Grothendieck

## Installation

1. Copy `english-chinese-mode.el` to your Emacs load path
2. Add to your init file:

```elisp
(require 'english-chinese-mode)
```

## Setup

Create HSK vocabulary CSV files at:
- `~/.mandarin-data/hsk1.csv`
- `~/.mandarin-data/hsk2.csv`

Each CSV should have the format: `chinese,pinyin,english`

## Usage

- `M-x english-chinese-mode` - Enable the mode
- `M-x cycle-english-chinese-display` - Cycle between off → Chinese → Pinyin → off

The mode automatically loads HSK vocabulary and replaces matching English words with their Chinese equivalents using overlays.
