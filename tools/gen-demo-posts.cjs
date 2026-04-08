/**
 * 生成演示文章：node tools/gen-demo-posts.cjs [--force]
 * （勿放在 Hexo 的 scripts/ 目录：该目录下文件会被 hexo generate 自动加载，且本脚本含 process.exit，会中断构建。）
 *
 * 规则：
 * - 若 source/_posts/ 下已有任意「非 demo-NN.md」的文章 → 不生成（避免干扰真实博文）
 * - 默认：只创建尚不存在的 demo-01 … demo-30（已存在则跳过）
 * - --force：无视已存在文件，全部覆盖重写 30 篇
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "source", "_posts");
const DEMO_RE = /^demo-\d{2}\.md$/;

const cats = ["随笔", "技术", "生活", "读书", "想法"];
const prefixes = ["笔记", "随想", "记录", "备忘", "片段"];

const bodies = [
  "这是一段自动生成的正文，用来撑开归档页与左侧目录。你可以整批删除这些 `demo-*.md` 后再写自己的文章。",
  "第二段：Markdown 支持 **粗体**、`行内代码`，以及列表：",
  "- 条目一\n- 条目二",
  "写博客的习惯是把思绪收紧再松开；演示数据没有含义，只看版式即可。"
];

function buildMarkdown(i) {
  const n = String(i).padStart(2, "0");
  const day = 1 + ((i * 3) % 27);
  const month = 1 + ((i * 2) % 12);
  const year = i <= 18 ? 2026 : 2025;
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(10 + (i % 8)).padStart(2, "0")}:00:00`;
  const cat = cats[(i - 1) % cats.length];
  const title = `${prefixes[(i - 1) % prefixes.length]} ${i}：演示标题占位`;
  const titleYaml = JSON.stringify(title);

  return (
    "---\n" +
    `title: ${titleYaml}\n` +
    `date: ${dateStr}\n` +
    "categories:\n" +
    `  - ${cat}\n` +
    "tags:\n" +
    "  - 演示\n" +
    `cover: https://picsum.photos/seed/demo${i}/640/400\n` +
    "---\n\n" +
    `## 第 ${i} 篇演示\n\n` +
    bodies.join("\n\n") +
    "\n"
  );
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  fs.mkdirSync(outDir, { recursive: true });

  const allFiles = fs.readdirSync(outDir);
  const mdFiles = allFiles.filter((f) => f.endsWith(".md"));
  const nonDemo = mdFiles.filter((f) => !DEMO_RE.test(f));

  if (nonDemo.length > 0) {
    console.log(
      "已检测到非演示文章（非 demo-NN.md），跳过生成，避免与真实博文混用："
    );
    nonDemo.forEach((f) => console.log("  -", f));
    console.log(
      "\n若仅需演示数据，请先移走或删除上述文件后再运行本脚本。"
    );
    process.exit(0);
  }

  let written = 0;
  let skipped = 0;

  for (let i = 1; i <= 30; i++) {
    const n = String(i).padStart(2, "0");
    const filename = `demo-${n}.md`;
    const fp = path.join(outDir, filename);

    if (fs.existsSync(fp) && !force) {
      skipped++;
      continue;
    }

    fs.writeFileSync(fp, buildMarkdown(i), "utf8");
    console.log("written", filename);
    written++;
  }

  if (written === 0 && skipped === 30 && !force) {
    console.log(
      "30 篇演示均已存在，未写入。若要全部覆盖请使用：npm run gen:demo -- --force"
    );
  } else {
    console.log(
      `done: 新建/覆盖 ${written} 个文件，跳过 ${skipped} 个已存在（source/_posts/）`
    );
  }
}

if (require.main === module) {
  main();
}
