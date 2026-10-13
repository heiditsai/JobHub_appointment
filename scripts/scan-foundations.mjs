#!/usr/bin/env node
/**
 * APOLLO Foundations 違規掃描器
 * 依 docs/APOLLO_Foundations_Rules.md 掃描全專案 tsx，輸出各類違規統計。
 *
 * 用法：
 *   node scripts/scan-foundations.mjs            # 全專案摘要 + per-file
 *   node scripts/scan-foundations.mjs <file...>  # 只掃指定檔案
 *   exit code：有違規 = 1，全乾淨 = 0
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const RULES = [
  {
    key: 'arbitrary-hex',
    label: '任意 hex 色 class（*-[#xxx]）',
    re: /(?:bg|text|border|ring|from|to|via|divide|shadow|fill|stroke|outline|accent|caret|decoration)-\[#[0-9a-fA-F]{3,8}\]/g,
  },
  {
    key: 'inline-hex',
    label: 'inline style 寫死色碼',
    re: /(?:color|background|backgroundColor|borderColor|fill|stroke|boxShadow)['"]?\s*:\s*['"]?[^,}'"]*#[0-9a-fA-F]{3,8}/g,
  },
  {
    key: 'non-token-color',
    // 只抓 theme 未定義的色系。amber/purple/indigo/slate 已是 MAYO UI 3.0 正式 token
    // （見 Foundations §1 Scale Tokens），JobHub.Frontend 現役使用中，故不列入黑名單。
    label: '非 token Tailwind 色系（gray/zinc/teal/orange/emerald…）',
    re: /(?:bg|text|border|ring|from|to|via|divide|shadow|fill|stroke)-(?:gray|zinc|neutral|stone|teal|orange|lime|emerald|cyan|sky|violet|fuchsia|pink|rose)-[0-9]+/g,
  },
  { key: 'font-black', label: 'font-black（禁用）', re: /\bfont-black\b/g },
  {
    key: 'font-bold',
    label: 'font-bold（Headline text-2xl 除外）',
    re: /\bfont-bold\b/g,
    exempt: (line) => /text-2xl/.test(line),
  },
  {
    key: 'arbitrary-text',
    label: '任意字級 text-[Npx]',
    re: /\btext-\[\d+(?:\.\d+)?px\]/g,
  },
  {
    key: 'spacing-off-scale',
    label: '非階梯 spacing（p/m/gap-7,9,10,11…）',
    re: /(?<![\w-])-?(?:[pm][xytrbl]?|gap(?:-[xy])?|space-[xy])-(?:7|9|10|11|13|14)\b/g,
  },
  {
    key: 'radius-arbitrary',
    label: '任意 radius rounded-[N]',
    re: /\brounded(?:-[trbl]{1,2})?-\[[^\]]+\]/g,
  },
  {
    key: 'radius-off-scale',
    label: 'radius 非五階（rounded-2xl/3xl，已從 theme 移除）',
    re: /\brounded(?:-[trbl]{1,2})?-(?:2xl|3xl)\b/g,
  },
  { key: 'shadow-legacy', label: 'shadow-level-1（改用 shadow-lg）', re: /\bshadow-level-1\b/g },
  {
    key: 'non-lucide-icon',
    label: '非 Lucide icon 來源',
    re: /from\s+['"](?:@heroicons|@fortawesome|react-icons|@mui\/icons)[^'"]*['"]|fa-(?:solid|regular|brands)/g,
  },
  {
    // 規範 §6.1：UI 文案與按鈕標籤一律不出現 emoji，需要圖示改用 lucide-react。
    // 涵蓋 emoji 主平面（1F000–1FAFF）、雜項符號與 Dingbats（2600–27BF，含 ✅⚠✓✗★）、
    // 雜項符號箭頭（2B00–2BFF，含 ⭐）、以及 2300 區段裡真正的 emoji（⌚⌛⏩–⏺）。
    // 刻意不含：排版箭號 → ← ↔（2190–21FF）與鍵盤符號 ⌘（2318）—— 屬 typography 非 emoji。
    // 註解行（// 、/* 、*）不會 render，予以豁免。
    key: 'emoji-in-ui',
    label: 'UI 文案／按鈕出現 emoji（改用 lucide-react）',
    re: /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}\u{231B}\u{23E9}-\u{23FA}]/gu,
    exempt: (line) => /^\s*(?:\/\/|\/\*|\*)/.test(line),
  },
  {
    // 規範 §7 Motion：禁止「忽大忽小／彈跳」——只抓帶互動前綴（hover/active/focus/
    // group-*/peer-*）的 scale-*／translate-*。不帶前綴的 transform 一律放行，因此
    // ui.tsx 的 translate-x-full／translate-y-full（Sheet 滑入）、-translate-y-1/2（定位置中）、
    // Modal 進場的 scale-95→scale-100、Switch 滑鈕 translate-x-[18px] 都不會被誤判；
    // rotate-*（chevron rotate-180、rotate-90）不在 pattern 內，明確放行。
    // 值只吃數字或 [..] 任意值，故 hover:translate-x-full 這類位置類別也不會誤傷。
    key: 'motion-scale-translate',
    label: '互動尺寸縮放／位移（hover|active|group-hover 的 scale-*／translate-*）',
    re: /\b(?:(?:group|peer)-)?(?:hover|active|focus|focus-visible|focus-within):-?(?:scale|translate)(?:-[xyz])?-(?:\[[^\]]+\]|\d+(?:\.\d+)?(?:\/\d+)?)/g,
  },
];

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collectFiles(p, acc);
    else if (p.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => resolve(f))
  : collectFiles(ROOT);

const totals = Object.fromEntries(RULES.map((r) => [r.key, 0]));
const perFile = [];

for (const file of targets) {
  const counts = Object.fromEntries(RULES.map((r) => [r.key, 0]));
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    for (const rule of RULES) {
      const hits = line.match(rule.re);
      if (!hits) continue;
      const n = rule.exempt && rule.exempt(line) ? 0 : hits.length;
      counts[rule.key] += n;
      totals[rule.key] += n;
    }
  }
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum > 0) perFile.push({ file: relative(ROOT, file), sum, counts });
}

console.log('=== APOLLO Foundations 違規掃描 ===\n');
let grand = 0;
for (const rule of RULES) {
  const n = totals[rule.key];
  grand += n;
  console.log(`${n === 0 ? '✅' : '❌'} ${String(n).padStart(5)}  ${rule.label}`);
}
console.log(`\n合計：${grand} 處違規`);

if (perFile.length) {
  console.log('\n--- 違規檔案（多到少）---');
  perFile.sort((a, b) => b.sum - a.sum);
  for (const { file, sum, counts } of perFile) {
    const detail = RULES.filter((r) => counts[r.key] > 0)
      .map((r) => `${r.key}:${counts[r.key]}`)
      .join(' ');
    console.log(`${String(sum).padStart(5)}  ${file}  [${detail}]`);
  }
}

process.exit(grand > 0 ? 1 : 0);
