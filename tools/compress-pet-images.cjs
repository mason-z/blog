/**
 * 将 source/images/uploads 下偏大的照片压缩到约 ≤100KB（输出 JPEG）。
 * 默认仅处理「宠物时间轴 + 宠物页头像」引用的图片，避免误压其他上传资源。
 * 环境变量 COMPRESS_PET_IMAGES=all 时处理 uploads 下全部偏大图片。
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const sharp = require("sharp");

const MAX_BYTES = 100 * 1024;
const ROOT = path.join(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT, "source", "images", "uploads");

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

/** 站内路径 → source 下绝对路径（仅处理 uploads 内图片） */
function mediaUrlToAbs(u) {
  if (u == null || typeof u !== "string") return null;
  let s = u.trim();
  if (!s || /^https?:\/\//i.test(s)) return null;
  s = s.replace(/^source\//, "");
  if (s.startsWith("/images/uploads/")) {
    return path.join(ROOT, "source", s.replace(/^\//, ""));
  }
  if (s.startsWith("images/uploads/")) {
    return path.join(ROOT, "source", s);
  }
  if (s.startsWith("/") && s.includes("uploads")) {
    return path.join(ROOT, "source", s.replace(/^\//, ""));
  }
  return null;
}

function parseFrontMatter(md) {
  if (!/^---\r?\n/.test(md)) return {};
  const end = md.indexOf("\n---", 4);
  if (end === -1) return {};
  try {
    return yaml.load(md.slice(4, end)) || {};
  } catch {
    return {};
  }
}

/** 收集宠物相关引用的图片绝对路径 */
function collectReferencedPetImageAbsPaths() {
  const set = new Set();

  const petsYml = path.join(ROOT, "source", "_data", "pets_timeline.yml");
  if (fs.existsSync(petsYml)) {
    try {
      const data = yaml.load(fs.readFileSync(petsYml, "utf8"));
      (data && data.entries ? data.entries : []).forEach((e) => {
        if (e && e.photo) {
          const abs = mediaUrlToAbs(String(e.photo));
          if (abs) set.add(path.normalize(abs));
        }
      });
    } catch (_) {
      /* health check 已校验 YAML；此处忽略 */
    }
  }

  const siteCms = path.join(ROOT, "source", "_data", "site_cms.yml");
  if (fs.existsSync(siteCms)) {
    try {
      const data = yaml.load(fs.readFileSync(siteCms, "utf8"));
      const av =
        data &&
        data.site_ui &&
        data.site_ui.pets_page &&
        data.site_ui.pets_page.avatar;
      if (av) {
        const abs = mediaUrlToAbs(String(av));
        if (abs) set.add(path.normalize(abs));
      }
    } catch (_) {}
  }

  const petsIdx = path.join(ROOT, "source", "pets", "index.md");
  if (fs.existsSync(petsIdx)) {
    const fm = parseFrontMatter(fs.readFileSync(petsIdx, "utf8"));
    if (fm.avatar) {
      const abs = mediaUrlToAbs(String(fm.avatar));
      if (abs) set.add(path.normalize(abs));
    }
  }

  return set;
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

  let files = collectFiles(UPLOADS_DIR).filter((f) => {
    const e = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp"].includes(e);
  });

  const scopeAll = process.env.COMPRESS_PET_IMAGES === "all";
  if (!scopeAll) {
    const refs = collectReferencedPetImageAbsPaths();
    if (refs.size > 0) {
      files = files.filter((f) => refs.has(path.normalize(f)));
      console.log(
        `[compress-pet-images] 仅处理宠物相关引用（${refs.size} 个路径）。COMPRESS_PET_IMAGES=all 可处理全部 uploads。`
      );
    } else {
      console.log(
        "[compress-pet-images] 未解析到宠物引用，回退为处理 uploads 下全部偏大图片。"
      );
    }
  } else {
    console.log("[compress-pet-images] COMPRESS_PET_IMAGES=all：处理全部 uploads。");
  }

  let n = 0;
  for (const f of files) {
    let st;
    try {
      st = fs.statSync(f);
    } catch {
      continue;
    }
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
