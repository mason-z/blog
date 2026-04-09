'use strict';

/**
 * 构建前自检：避免合并冲突标记、缺失 site_cms 等导致「后台改了但页面不变」或构建失败。
 * 放在 tools/，勿放 scripts/（Hexo 会加载 scripts/ 下全部脚本）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'public',
  '.deploy_git',
]);

const MARKERS = ['<<<<<<<', '=======', '>>>>>>>'];

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, out);
    } else if (/\.(yml|yaml|md|ejs|js|json|html)$/i.test(ent.name)) {
      out.push(p);
    }
  }
}

function main() {
  const files = [];
  walk(ROOT, files);

  const bad = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of MARKERS) {
      if (text.includes(m)) {
        bad.push({ file, marker: m });
        break;
      }
    }
  }

  if (bad.length) {
    console.error('[check-repo-health] 发现未解决的 Git 合并标记，请先手动解决后再构建：');
    for (const { file, marker } of bad) {
      console.error(`  ${path.relative(ROOT, file)}  (${marker})`);
    }
    process.exit(1);
  }

  const siteCms = path.join(ROOT, 'source', '_data', 'site_cms.yml');
  if (!fs.existsSync(siteCms)) {
    console.error('[check-repo-health] 缺少 source/_data/site_cms.yml（全站后台合并配置）。');
    process.exit(1);
  }

  const yml = fs.readFileSync(siteCms, 'utf8');
  if (!/^site_name:/m.test(yml) || !/^theme:/m.test(yml) || !/^site_ui:/m.test(yml)) {
    console.error(
      '[check-repo-health] site_cms.yml 结构异常：应包含顶层 site_name / theme / site_ui 等键。'
    );
    process.exit(1);
  }

  console.log('[check-repo-health] OK');
}

main();
