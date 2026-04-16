#!/usr/bin/env node
'use strict';

/**
 * 双仓库工作流：把「私库」里的博客架构（主题、构建脚本、依赖、Hexo 配置等）同步到「公库」，
 * 公库与私库可各自维护博文与敏感素材，实现「架构一致、内容可分离」（含匿名/隐私写作场景）。
 *
 * 典型分工：
 *   · 私库：完整文章、不便公开的数据、本地预览与构建。
 *   · 公库：仅对外站点需要的文章与资源；架构由本脚本从私库推送，避免两套主题分叉。
 *
 * 用法：
 *   1. 复制 tools/sync-blog-architecture.config.example.json 为
 *      tools/sync-blog-architecture.config.json，改 from / to 为两个仓库根目录的绝对路径。
 *   2. 在私库根目录执行： npm run sync:public
 *      或： node tools/sync-blog-architecture.cjs
 *      或： node tools/sync-blog-architecture.cjs --config path/to/config.json
 *
 * 环境变量（未使用 --config 且未找到 config 文件时可用）：
 *   BLOG_SYNC_FROM  私库根目录
 *   BLOG_SYNC_TO    公库根目录
 *
 * 选项：
 *   --dry-run   只打印将要复制的路径，不写入
 *   --help      说明
 *
 * 注意：默认会 mirror 目录（先删公库内对应目录再整棵复制），避免私库已删文件在公库残留。
 *       默认禁止把 source/_posts、source/_drafts 列入 paths（除非在配置里显式 skipForbiddenPathCheck），
 *       避免匿名稿误推到公库。source/_data、各栏目 index.md 等是否同步由你在 paths 中按需列出：
 *       若希望公库栏目文案与私库完全独立，不要同步这些路径，只在公库单独编辑。
 */

const fs = require('fs');
const path = require('path');

const CONFIG_NAME = 'sync-blog-architecture.config.json';
const EXAMPLE_NAME = 'sync-blog-architecture.config.example.json';

function printHelp() {
  console.log(`
sync-blog-architecture — 从私库同步博客架构到公库

复制 ${EXAMPLE_NAME} 为 ${CONFIG_NAME} 并填写 from / to，然后：
  npm run sync:public
`);
}

function loadJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function resolveConfigPath() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) return path.resolve(argv[i + 1]);
  }
  const local = path.join(__dirname, CONFIG_NAME);
  if (fs.existsSync(local)) return local;
  return null;
}

function resolveRoot(p) {
  if (p == null || String(p).trim() === '') return null;
  const s = String(p).trim();
  return path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
}

function normalizeRel(relRaw) {
  return relRaw.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** 禁止同步的路径前缀（相对仓库根），防止误把博文/草稿推到公库。 */
const DEFAULT_FORBIDDEN_PREFIXES = ['source/_posts', 'source/_drafts'];

function isUnderForbiddenPrefix(relNorm, forbidden) {
  const list = Array.isArray(forbidden) && forbidden.length > 0 ? forbidden : DEFAULT_FORBIDDEN_PREFIXES;
  for (const raw of list) {
    const pref = normalizeRel(String(raw));
    if (!pref) continue;
    if (relNorm === pref || relNorm.startsWith(pref + '/')) return true;
  }
  return false;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  const dryRun = argv.includes('--dry-run');

  let config;
  const configPath = resolveConfigPath();
  if (configPath) {
    config = loadJson(configPath);
  } else if (process.env.BLOG_SYNC_FROM && process.env.BLOG_SYNC_TO) {
    const ex = loadJson(path.join(__dirname, EXAMPLE_NAME));
    config = {
      from: process.env.BLOG_SYNC_FROM,
      to: process.env.BLOG_SYNC_TO,
      mirror: true,
      paths: ex.paths,
      forbidPathPrefixes: ex.forbidPathPrefixes,
      skipForbiddenPathCheck: ex.skipForbiddenPathCheck,
    };
  } else {
    console.error(
      `[sync-blog-architecture] 未找到配置。请任选其一：\n` +
        `  · 复制 tools/${EXAMPLE_NAME} 为 tools/${CONFIG_NAME} 并填写 from / to\n` +
        `  · 或设置环境变量 BLOG_SYNC_FROM 与 BLOG_SYNC_TO\n` +
        `  · 或传入 --config /path/to/config.json\n`
    );
    process.exit(1);
  }

  const from = resolveRoot(config.from);
  const to = resolveRoot(config.to);
  const mirror = config.mirror !== false;
  const paths = Array.isArray(config.paths) ? config.paths : [];
  const forbidPathPrefixes =
    config.forbidPathPrefixes != null
      ? config.forbidPathPrefixes
      : DEFAULT_FORBIDDEN_PREFIXES;
  const skipForbiddenPathCheck = config.skipForbiddenPathCheck === true;

  if (!from || !to) {
    console.error('[sync-blog-architecture] 配置中 from / to 无效。');
    process.exit(1);
  }
  if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) {
    console.error('[sync-blog-architecture] 私库目录不存在或不是目录:', from);
    process.exit(1);
  }
  if (!fs.existsSync(to) || !fs.statSync(to).isDirectory()) {
    console.error('[sync-blog-architecture] 公库目录不存在或不是目录:', to);
    process.exit(1);
  }

  if (path.resolve(from) === path.resolve(to)) {
    console.error('[sync-blog-architecture] from 与 to 不能是同一目录。');
    process.exit(1);
  }

  if (paths.length === 0) {
    console.error('[sync-blog-architecture] paths 为空。');
    process.exit(1);
  }

  if (!skipForbiddenPathCheck) {
    const bad = [];
    for (const relRaw of paths) {
      const rel = normalizeRel(relRaw);
      if (isUnderForbiddenPrefix(rel, forbidPathPrefixes)) bad.push(rel);
    }
    if (bad.length > 0) {
      console.error(
        '[sync-blog-architecture] 以下 paths 会同步博文/草稿目录，默认已禁止（匿名与隐私场景请勿把私库文章推到公库）：\n' +
          bad.map((b) => `  · ${b}`).join('\n') +
          '\n若你确实要同步，请在配置中设置 "skipForbiddenPathCheck": true。'
      );
      process.exit(1);
    }
  }

  console.log('[sync-blog-architecture] 私库:', from);
  console.log('[sync-blog-architecture] 公库:', to);
  console.log('[sync-blog-architecture] mirror 目录:', mirror);
  if (dryRun) console.log('[sync-blog-architecture] DRY-RUN（不写入）\n');

  for (const relRaw of paths) {
    const rel = normalizeRel(relRaw);
    if (!rel || rel.includes('..')) {
      console.warn('[sync-blog-architecture] 跳过非法路径:', relRaw);
      continue;
    }
    const src = path.join(from, rel);
    const dst = path.join(to, rel);

    if (!fs.existsSync(src)) {
      console.warn('[sync-blog-architecture] 跳过（私库中不存在）:', rel);
      continue;
    }

    const st = fs.statSync(src);
    if (dryRun) {
      console.log('  →', rel, st.isDirectory() ? '(目录)' : '(文件)');
      continue;
    }

    if (st.isDirectory()) {
      if (mirror && fs.existsSync(dst)) {
        fs.rmSync(dst, { recursive: true, force: true });
      }
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.cpSync(src, dst, { recursive: true });
      console.log('  ✓', rel);
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log('  ✓', rel);
    }
  }

  if (dryRun) {
    console.log('\n[sync-blog-architecture] dry-run 结束。去掉 --dry-run 后执行会写入公库。');
  } else {
    console.log('\n[sync-blog-architecture] 完成。建议在公库执行 npm install && npm run build 验证。');
  }
}

main();
