'use strict';

/**
 * 构建前自检：合并冲突标记、site_cms、关键 _data YAML、Decap 双份配置一致性。
 * 放在 tools/，勿放 scripts/（Hexo 会加载 scripts/ 下全部脚本）。
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'public',
  '.deploy_git',
]);

const MARKERS = ['<<<<<<<', '=======', '>>>>>>>'];

/** 需能 parse 的站点数据（损坏则构建后页面异常） */
const DATA_YAML_FILES = [
  ['source/_data/site_cms.yml', 'site_cms'],
];

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

function tryParseYaml(filePath, label) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`[check-repo-health] 无法读取 ${label}: ${filePath}`);
    process.exit(1);
  }
  try {
    yaml.load(text);
  } catch (e) {
    console.error(`[check-repo-health] YAML 解析失败 (${label}): ${path.relative(ROOT, filePath)}`);
    console.error(String(e.message || e));
    process.exit(1);
  }
}

function checkAdminConfigUniqueNames() {
  const p = path.join(ROOT, 'source', 'admin', 'config.yml');
  let cfg;
  try {
    cfg = yaml.load(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('[check-repo-health] admin config.yml 解析失败:', String(e.message || e));
    process.exit(1);
  }
  const names = (cfg.collections || []).map((c) => c && c.name).filter(Boolean);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) {
    console.error('[check-repo-health] Decap collections 名称重复:', [...new Set(dup)].join(', '));
    process.exit(1);
  }
  for (const col of cfg.collections || []) {
    if (!col.files) continue;
    const fn = col.files.map((f) => f && f.name).filter(Boolean);
    const fd = fn.filter((n, i) => fn.indexOf(n) !== i);
    if (fd.length) {
      console.error(
        `[check-repo-health] Decap 集合「${col.name}」内 files 名称重复:`,
        [...new Set(fd)].join(', ')
      );
      process.exit(1);
    }
  }
}

function checkAdminConfigSync() {
  const src = path.join(ROOT, 'source', 'admin', 'config.yml');
  const pub = path.join(ROOT, 'public', 'admin', 'config.yml');
  if (!fs.existsSync(src)) {
    console.error('[check-repo-health] 缺少 source/admin/config.yml');
    process.exit(1);
  }
  if (!fs.existsSync(pub)) {
    console.warn('[check-repo-health] 提示: 尚无 public/admin/config.yml，构建后会由 sync:admin 生成。');
    return;
  }
  const a = fs.readFileSync(src);
  const b = fs.readFileSync(pub);
  if (a.length !== b.length || !a.equals(b)) {
    console.error(
      '[check-repo-health] source/admin/config.yml 与 public/admin/config.yml 不一致。\n' +
        '  通常执行一次「npm run build」或「npm run validate」即可（会自动同步）。\n' +
        '  若仍失败，请检查是否只改了 public 而未改 source，或文件被占用。'
    );
    process.exit(1);
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

  for (const [rel, label] of DATA_YAML_FILES) {
    const p = path.join(ROOT, ...rel.split('/'));
    if (!fs.existsSync(p)) {
      console.error(`[check-repo-health] 缺少数据文件: ${rel}`);
      process.exit(1);
    }
    tryParseYaml(p, label);
  }

  checkAdminConfigUniqueNames();
  checkAdminConfigSync();

  console.log('[check-repo-health] OK');
}

main();
