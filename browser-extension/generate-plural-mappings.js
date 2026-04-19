#!/usr/bin/env node
// Generates plural-mappings.md: every vocab word + its plural forms and what they map to.

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'hsk1_v3.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

// Build wordMap identical to the extension's loadVocabulary()
// Track base English words → { chinese, pinyin }
const wordMap = {};        // englishLower → { chinese, pinyin }
const baseWords = [];      // all base English words in order (for output)

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const first  = line.indexOf(',');
  const second = line.indexOf(',', first + 1);
  if (first === -1 || second === -1) continue;
  const chinese      = line.slice(0, first).trim();
  const pinyin       = line.slice(first + 1, second).trim();
  const englishField = line.slice(second + 1).trim();
  for (const eng of englishField.split(';')) {
    const engLower = eng.trim().toLowerCase();
    if (engLower) {
      if (!wordMap[engLower]) baseWords.push(engLower);
      wordMap[engLower] = { chinese, pinyin };
    }
  }
}

// Must stay in sync with content.js
const NO_PLURAL = new Set(['us']);

function generatePlurals(word) {
  if (word.includes(' ') || word.length < 2) return [];
  if (NO_PLURAL.has(word)) return [];
  if (word.endsWith('fe') && word.length > 3) return [word.slice(0, -2) + 'ves'];
  if (word.endsWith('f') && !word.endsWith('ff') && word.length > 2) return [word.slice(0, -1) + 'ves'];
  if (word.endsWith('y') && word.length > 2 && !/[aeiou]y$/.test(word)) return [word.slice(0, -1) + 'ies'];
  if (/(?:[sxz]|[cs]h)$/.test(word)) return [word + 'es'];
  return [word + 's'];
}

// Build the reverse lookup: plural → base word it was generated from
// (mirrors addPluralFallbacks, but we track the source word too)
const pluralToBase = {};
for (const word of baseWords) {
  if (wordMap[word]) {
    for (const plural of generatePlurals(word)) {
      if (!pluralToBase[plural]) {
        pluralToBase[plural] = word;
      }
    }
  }
}

// Singularize: given a word (plural), what base word does the extendedMap resolve it to?
// Returns { word: baseWord, entry: {chinese, pinyin}, via: 'explicit'|'fallback'|'miss' }
function singularize(plural) {
  if (wordMap[plural]) {
    return { word: plural, entry: wordMap[plural], via: 'explicit' };
  }
  const base = pluralToBase[plural];
  if (base) {
    return { word: base, entry: wordMap[base], via: 'fallback' };
  }
  return { word: null, entry: null, via: 'miss' };
}

// Generate report grouped by source Chinese entry to avoid duplication
// We'll iterate over all base words and report plurals

const outputLines = [];
outputLines.push('# Plural Mappings — Full Vocab Review');
outputLines.push('');
outputLines.push('> Every vocab entry and its generated plural forms. Check for weirdness.');
outputLines.push('');
outputLines.push('Flags: ✓ = maps correctly | ⚠ COLLISION = plural is already an explicit vocab entry for a different word | ✗ MISS = singularize fails | ⚡ WRONG = maps to different word');
outputLines.push('');
outputLines.push('| English word | Chinese | Pinyin | Plural forms → mapping |');
outputLines.push('|---|---|---|---|');

const collisions = [];
const misses = [];
const wrongs = [];

for (const word of baseWords) {
  const entry = wordMap[word];
  if (!entry) continue;

  const plurals = generatePlurals(word);

  let pluralCol;
  if (word.includes(' ')) {
    pluralCol = '*(phrase — no plurals)*';
  } else if (NO_PLURAL.has(word)) {
    pluralCol = '*(NO_PLURAL — excluded)*';
  } else if (plurals.length === 0) {
    pluralCol = '*(no plurals generated)*';
  } else {
    const parts = [];
    for (const plural of plurals) {
      const result = singularize(plural);
      let flag;
      if (result.via === 'explicit' && result.entry.chinese !== entry.chinese) {
        flag = `⚠ COLLISION → maps to \`${result.word}\` (${result.entry.chinese})`;
        collisions.push({ word, plural, entry, collision: result });
      } else if (result.via === 'miss') {
        flag = '✗ MISS';
        misses.push({ word, plural, entry });
      } else if (result.via === 'fallback' && result.word !== word) {
        flag = `⚡ WRONG → maps to \`${result.word}\` (${result.entry.chinese})`;
        wrongs.push({ word, plural, entry, result });
      } else if (result.via === 'explicit' && result.entry.chinese === entry.chinese) {
        flag = `✓ (explicit entry)`;
      } else {
        flag = '✓';
      }
      parts.push(`\`${plural}\` → ${flag}`);
    }
    pluralCol = parts.join('<br>');
  }

  outputLines.push(`| \`${word}\` | ${entry.chinese} | ${entry.pinyin} | ${pluralCol} |`);
}

outputLines.push('');
outputLines.push('---');
outputLines.push('');
outputLines.push(`## Summary`);
outputLines.push('');
outputLines.push(`- **Total vocab entries:** ${baseWords.length}`);
outputLines.push(`- **Collisions (plural is already explicit vocab for a different word):** ${collisions.length}`);
outputLines.push(`- **Misses (singularize fails):** ${misses.length}`);
outputLines.push(`- **Wrong mappings:** ${wrongs.length}`);
outputLines.push('');

if (collisions.length > 0) {
  outputLines.push('### Collisions (plural already exists as explicit vocab entry)');
  outputLines.push('');
  outputLines.push('These are handled correctly — the explicit entry takes precedence. Listed for awareness:');
  outputLines.push('');
  for (const c of collisions) {
    outputLines.push(`- \`${c.plural}\` is plural of \`${c.word}\` (${c.entry.chinese}), but \`${c.plural}\` itself explicitly maps to \`${c.collision.word}\` (${c.collision.entry.chinese})`);
  }
  outputLines.push('');
}

if (misses.length > 0) {
  outputLines.push('### Misses (plural not found — potential bugs)');
  outputLines.push('');
  for (const m of misses) {
    outputLines.push(`- \`${m.plural}\` (plural of \`${m.word}\` / ${m.entry.chinese}) — not in extended map`);
  }
  outputLines.push('');
}

if (wrongs.length > 0) {
  outputLines.push('### Wrong mappings (maps to a different base word)');
  outputLines.push('');
  for (const w of wrongs) {
    outputLines.push(`- \`${w.plural}\` (plural of \`${w.word}\` / ${w.entry.chinese}) → maps to \`${w.result.word}\` (${w.result.entry.chinese})`);
  }
  outputLines.push('');
}

outputLines.push('*Generated by generate-plural-mappings.js*');

const output = outputLines.join('\n') + '\n';
const outPath = path.join(__dirname, 'plural-mappings.md');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Written: ${outPath}`);
console.log(`Vocab entries: ${baseWords.length}`);
console.log(`Collisions: ${collisions.length}, Misses: ${misses.length}, Wrong: ${wrongs.length}`);
