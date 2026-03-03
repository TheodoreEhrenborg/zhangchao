# 涨潮 (zhāng cháo)

A minor mode for Emacs that replaces English words with Chinese characters or Pinyin.

> "La mer monte." - Alexandre Grothendieck

## Installation

1. Copy `zhangchao.el` to your Emacs load path
2. Add to your init file:

```elisp
(require 'zhangchao)
```

## Setup

Create HSK vocabulary CSV files at:
- `~/.mandarin-data/hsk1.csv`
- `~/.mandarin-data/hsk2.csv`

Each CSV should have the format: `chinese,pinyin,english` (English supports semicolon-separated synonyms). Lines starting with `#` are comments.

## Public API

| Symbol | Type | Description |
|---|---|---|
| `zhangchao-mode` | Minor mode | Toggle the mode on/off |
| `zhangchao-cycle-display` | Command | Cycle off -> Chinese -> Pinyin -> off |
| `zhangchao-debug-vocabulary` | Command | Show loaded vocabulary info |
| `zhangchao-csv-files` | Variable | List of CSV file paths to load |
| `zhangchao-idle-delay` | Variable | Seconds before restoring overlays after edit (default 10) |
| `zhangchao-mode-map` | Keymap | Keymap for the minor mode |

## Usage

- `M-x zhangchao-mode` - Enable the mode
- `M-x zhangchao-cycle-display` - Cycle between off -> Chinese -> Pinyin -> off

The mode automatically loads HSK vocabulary and replaces matching English words with their Chinese equivalents using overlays.
