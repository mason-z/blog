/**
 * 一次性生成演示文章：node scripts/gen-demo-posts.cjs
 * 生成 source/_posts/demo-01.md … demo-30.md（若已存在则覆盖）
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "source", "_posts");
const cats = ["随笔", "技术", "生活", "读书", "想法"];
const prefixes = ["笔记", "随想", "记录", "备忘", "片段"];

const bodies = [
  "这是一段自动生成的正文，用来撑开归档页与左侧目录。你可以整批删除这些 `demo-*.md` 后再写自己的文章。",
  "第二段：Markdown 支持 **粗体**、`行内代码`，以及列表：",
  "- 条目一\n- 条目二",
  "写博客的习惯是把思绪收紧再松开；演示数据没有含义，只看版式即可。"
];

for (let i = 1; i <= 30; i++) {
  const n = String(i).padStart(2, "0");
  const slug = `demo-${n}`;
  const day = 1 + ((i * 3) % 27);
  const month = 1 + ((i * 2) % 12);
  const year = i <= 18 ? 2026 : 2025;
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(10 + (i % 8)).padStart(2, "0")}:00:00`;
  const cat = cats[(i - 1) % cats.length];
  const title = `${prefixes[(i - 1) % prefixes.length]} ${i}：演示标题占位`;
  const titleYaml = JSON.stringify(title);

  const md =
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
    "\n";

  fs.writeFileSync(path.join(outDir, `${slug}.md`), md, "utf8");
  console.log("written", slug + ".md");
}

console.log("done: 30 files in source/_posts/");
