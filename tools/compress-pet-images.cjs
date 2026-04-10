/**
 * 将 source/images/uploads 下偏大的照片压缩到约 ≤100KB（输出 JPEG）。
 * 一次性读入内存再处理，避免 Windows 上同一路径被 sharp 多次打开导致 UNKNOWN/open 失败。
 *
 * 用法：npm run compress:pet-images（build / build:prod 已自动执行）
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const MAX_BYTES = 100 * 1024;
const UPLOADS_DIR = path.join(__dirname, "..", "source", "images", "uploads");

function collectFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const names = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of names) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) collectFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

async function jpegFromBuffer(inputBuf, maxW, quality) {
  let p = sharp(inputBuf).rotate();
  if (maxW > 0) {
    p = p.resize({ width: maxW, withoutEnlargement: true });
  }
  return p.jpeg({ quality, mozjpeg: true }).toBuffer();
}

async function compressOne(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  const stat = fs.statSync(absPath);
  if (stat.size <= MAX_BYTES) return { skipped: true, reason: "small" };

  const base = path.basename(absPath, ext);
  const dir = path.dirname(absPath);
  const jpegPath =
    ext === ".jpeg" || ext === ".jpg" ? absPath : path.join(dir, `${base}.jpg`);

  let inputBuf = fs.readFileSync(absPath);
  const meta = await sharp(inputBuf).metadata();
  const origW = meta.width || 2000;

  const qualities = [82, 75, 68, 60, 52, 45, 38, 32];
  const maxWidths = [
    origW,
    Math.min(origW, 1600),
    1400,
    1200,
    1000,
    900,
    800,
    700,
    600,
    520,
    440,
    380,
  ];

  let bestBuf = null;
  let bestSize = Infinity;

  outer: for (const maxW of maxWidths) {
    for (const q of qualities) {
      const buf = await jpegFromBuffer(inputBuf, maxW < origW ? maxW : 0, q);
      if (buf.length <= MAX_BYTES) {
        bestBuf = buf;
        break outer;
      }
      if (buf.length < bestSize) {
        bestSize = buf.length;
        bestBuf = buf;
      }
    }
  }

  if (!bestBuf) return { skipped: true, reason: "empty" };

  if (jpegPath !== absPath && ext !== ".jpg" && ext !== ".jpeg") {
    fs.writeFileSync(jpegPath, bestBuf);
    fs.unlinkSync(absPath);
    inputBuf = null;
    if (bestBuf.length > MAX_BYTES) {
      console.warn(
        `仍约 ${(bestBuf.length / 1024).toFixed(1)} KB（目标 ≤100KB）。请换更小的原图。`
      );
    }
    console.warn(
      `已从 ${path.basename(absPath)} 转为 ${path.basename(jpegPath)}，请在后台把时间轴里的图片路径改为新文件名。`
    );
    return { converted: true, to: jpegPath, bytes: bestBuf.length };
  }

  fs.writeFileSync(jpegPath, bestBuf);
  if (bestBuf.length > MAX_BYTES) {
    console.warn(
      `${path.basename(jpegPath)} 仍约 ${(bestBuf.length / 1024).toFixed(1)} KB，可换更小的原图再运行本脚本。`
    );
  }
  return { written: true, path: jpegPath, bytes: bestBuf.length };
}

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("目录不存在，跳过：", UPLOADS_DIR);
    process.exit(0);
  }
  const files = collectFiles(UPLOADS_DIR).filter((f) => {
    const e = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp"].includes(e);
  });

  let n = 0;
  for (const f of files) {
    const st = fs.statSync(f);
    if (st.size <= MAX_BYTES) continue;
    try {
      const r = await compressOne(f);
      if (r.skipped) continue;
      n += 1;
      console.log(
        r.converted
          ? `已转换并压缩: ${f} -> ${r.to} (${(r.bytes / 1024).toFixed(1)} KB)`
          : `已压缩: ${r.path} (${(r.bytes / 1024).toFixed(1)} KB)`
      );
    } catch (err) {
      console.error("失败:", f, err.message || err);
    }
  }
  if (n === 0) console.log("没有需要压缩的文件（或均已 ≤100KB）。");
  else console.log(`完成，处理 ${n} 个文件。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
