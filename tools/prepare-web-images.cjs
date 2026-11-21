#!/usr/bin/env node
'use strict';

/**
 * 方案 3：从 assets/（原图，不进 Git）与 legacy uploads 生成压缩版 source/images/web/
 * 供 Hexo 复制到 public/images/web/；并写入 tools/.web-image-manifest.json 供构建时 URL 替换。
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  resolveSourceAbs,
  collectMarkdownImageRefs,
  collectHtmlImageSrcRefs,
  collectYamlImageStrings,
  walkContentFiles,
  manifestKeysForRef,
  normalizeRef,
} = require('./web-image-utils.cjs');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const WEB_DIR = path.join(ROOT, 'source', 'images', 'web');
const MANIFEST_PATH = path.join(__dirname, '.web-image-manifest.json');

const MAX_BYTES = Number(process.env.WEB_IMAGE_MAX_KB || 180) * 1024;
const MAX_WIDTH = Number(process.env.WEB_IMAGE_MAX_WIDTH || 1920);

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn('[prepare-web-images] sharp 未安装，将仅复制图片（不压缩）。npm install sharp');
}

function parseFrontMatter(md) {
  if (!/^---\r?\n/.test(md)) return { data: {}, body: md };
  const end = md.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: md };
  let data = {};
  try {
    data = yaml.load(md.slice(4, end)) || {};
  } catch (_) {}
  return { data, body: md.slice(end + 4) };
}

function collectAllRefs() {
  const files = [];
  walkContentFiles(ROOT, files);
  const pairs = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/\.(yml|yaml)$/i.test(file)) {
      try {
        const data = yaml.load(text);
        const refs = [];
        collectYamlImageStrings(data, refs);
        refs.forEach((ref) => pairs.push({ ref, fromFile: file }));
      } catch (_) {}
      continue;
    }
    const { data, body } = parseFrontMatter(text);
    ['cover', 'thumbnail', 'banner', 'avatar', 'photo', 'image'].forEach((k) => {
      if (data[k]) pairs.push({ ref: String(data[k]), fromFile: file });
    });
    collectMarkdownImageRefs(body).forEach((ref) => pairs.push({ ref, fromFile: file }));
    collectHtmlImageSrcRefs(body).forEach((ref) => pairs.push({ ref, fromFile: file }));
  }

  return pairs;
}

function safeWebName(absPath) {
  const base = path.basename(absPath, path.extname(absPath));
  return base.replace(/[^\w\u4e00-\u9fff.-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || `img-${Date.now()}`;
}

async function compressToWebBuffer(inputBuf) {
  if (!sharp) return { buf: inputBuf, ext: '.jpg' };

  let img = sharp(inputBuf).rotate();
  const meta = await img.metadata();
  const w = meta.width || MAX_WIDTH;
  if (w > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH, withoutEnlargement: true });

  const qualities = [82, 76, 70, 64, 58, 52, 46, 40];
  let bestWebp = null;
  let bestWebpSize = Infinity;

  for (const q of qualities) {
    const buf = await img.clone().webp({ quality: q }).toBuffer();
    if (buf.length <= MAX_BYTES) return { buf, ext: '.webp' };
    if (buf.length < bestWebpSize) {
      bestWebpSize = buf.length;
      bestWebp = buf;
    }
  }

  let bestJpg = null;
  let bestJpgSize = Infinity;
  for (const q of qualities) {
    const buf = await img.clone().jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (buf.length <= MAX_BYTES) return { buf, ext: '.jpg' };
    if (buf.length < bestJpgSize) {
      bestJpgSize = buf.length;
      bestJpg = buf;
    }
  }

  if (bestWebp && bestWebpSize <= bestJpgSize) return { buf: bestWebp, ext: '.webp' };
  return { buf: bestJpg || bestWebp || inputBuf, ext: '.jpg' };
}

async function processOne(absPath, manifest) {
  if (!fs.existsSync(absPath)) return null;

  const stem = safeWebName(absPath);
  let outExt = '.webp';
  let outBuf;

  const stat = fs.statSync(absPath);
  const inputBuf = fs.readFileSync(absPath);

  if (sharp && /\.(jpe?g|png|webp|gif|avif|tiff?|bmp)$/i.test(absPath)) {
    const r = await compressToWebBuffer(inputBuf);
    outBuf = r.buf;
    outExt = r.ext;
  } else {
    outBuf = inputBuf;
    outExt = path.extname(absPath).toLowerCase() || '.bin';
  }

  const outName = stem + outExt;
  const outAbs = path.join(WEB_DIR, outName);
  fs.writeFileSync(outAbs, outBuf);

  const publicUrl = `/images/web/${outName}`;
  return { publicUrl, bytes: outBuf.length, source: absPath };
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.mkdirSync(WEB_DIR, { recursive: true });

  const pairs = collectAllRefs();
  const manifest = {};
  const sourceToPublic = new Map();
  let n = 0;

  for (const { ref, fromFile } of pairs) {
    const abs = resolveSourceAbs(ref, fromFile, ROOT);
    if (!abs) continue;

    let publicUrl = sourceToPublic.get(abs);
    if (!publicUrl) {
      try {
        const result = await processOne(abs, manifest);
        if (!result) continue;
        publicUrl = result.publicUrl;
        sourceToPublic.set(abs, publicUrl);
        n += 1;
        console.log(
          `[prepare-web-images] ${path.relative(ROOT, abs)} → ${publicUrl} (${(result.bytes / 1024).toFixed(1)} KB)`
        );
      } catch (e) {
        console.warn('[prepare-web-images] 跳过', abs, e.message || e);
        continue;
      }
    }

    manifestKeysForRef(ref, publicUrl).forEach((k) => {
      manifest[k] = publicUrl;
    });
    manifest[normalizeRef(ref)] = publicUrl;
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[prepare-web-images] 完成：${n} 张 → ${path.relative(ROOT, WEB_DIR)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
