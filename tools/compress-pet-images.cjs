/**
 * 将 source/images/uploads 下偏大的照片压缩到约 ≤100KB（优先 JPEG）。
 * 用法：npm run compress:pet-images
 * 依赖：sharp（devDependency）
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

async function compressOne(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  const stat = fs.statSync(absPath);
  if (stat.size <= MAX_BYTES) return { skipped: true, reason: "small" };

  const base = path.basename(absPath, ext);
  const dir = path.dirname(absPath);
  const jpegPath =
    ext === ".jpeg" || ext === ".jpg" ? absPath : path.join(dir, `${base}.jpg`);

  let input = sharp(absPath).rotate();
  const meta = await input.metadata();
  let width = meta.width || 2000;

  const tryWrite = async (w, q) => {
    const pipeline = sharp(absPath).rotate();
    const resized = w < width ? pipeline.resize({ width: w, withoutEnlargement: true }) : pipeline;
    return resized.jpeg({ quality: q, mozjpeg: true }).toBuffer();
  };

  let bestBuf = null;
  const qualities = [82, 75, 68, 60, 52, 45];
  const widths = [width, Math.min(width, 1600), 1400, 1200, 1000, 800, 640];

  outer: for (const w of widths) {
    for (const q of qualities) {
      const buf = await tryWrite(w, q);
      if (buf.length <= MAX_BYTES) {
        bestBuf = buf;
        break outer;
      }
      if (!bestBuf || buf.length < bestBuf.length) bestBuf = buf;
    }
  }

  if (!bestBuf) return { skipped: true, reason: "empty" };

  if (jpegPath !== absPath && fs.existsSync(absPath) && ext !== ".jpg" && ext !== ".jpeg") {
    fs.writeFileSync(jpegPath, bestBuf);
    fs.unlinkSync(absPath);
    if (bestBuf.length > MAX_BYTES) {
      console.warn(
        `仍约 ${(bestBuf.length / 1024).toFixed(1)} KB（目标 ≤100KB）。请改用小图或手动调低质量。`
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
      console.error("失败:", f, err.message);
    }
  }
  if (n === 0) console.log("没有需要压缩的文件（或均已 ≤100KB）。");
  else console.log(`完成，处理 ${n} 个文件。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
