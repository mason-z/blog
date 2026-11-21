# tony-blog 版式与样式说明（扁平编辑风）

> 给后续改版用的交接文档。改动日期 2026-11-21。
> 目标：去掉卡片感，走 immarcus.com/blog 那种"纯文字 + 留白"的编辑阅读风；字号整体放大。
> 参考站是 Docusaurus，只借版式，不借实现。

## 1. 一句话原则

**内容区不再是一个个盒子，而是一条条排下来的文字。** 区分靠留白和 1px 细线，不靠边框、圆角、阴影、底色。

## 2. 硬规则

| 允许 | 禁止 |
| --- | --- |
| `1px solid var(--border-faint)` 细分隔线 | 内容区任何 `border-radius` ≥ 4px 的"卡片" |
| 纯留白（`padding` / `margin`）分区 | `box-shadow` 做浮起感（按钮、弹层除外） |
| 纯文字徽章（小字号 + `letter-spacing` + 颜色） | 胶囊形标签（`border-radius: 999px` + 背景 + 边框） |
| 顶栏实底 + 一条细线 | 毛玻璃 / `backdrop-filter` / 顶栏投影 |
| 衬线标题（`--font-display`） | 内容区标题用无衬线粗体堆重量 |

两条例外：**表单控件**（`.btn`、`.theme-toggle`、`.nav-toggle`、`.weather-chip`）和**弹层**（lightbox）保留原有的按钮/浮层外观，它们不是内容卡片。

## 3. 设计令牌

定义在 `source/css/style.css` 顶部 `:root` 与 `html[data-theme="dark"]`。

| 令牌 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--bg` / `--surface` | `#ffffff` | `#12121a` / `#1a1a24` | 页面底色 |
| `--border` | `rgba(0,0,0,.10)` | `rgba(255,255,255,.10)` | 控件描边 |
| `--border-faint` | `rgba(0,0,0,.07)` | `rgba(255,255,255,.09)` | **列表/文章之间的分隔线** |
| `--text` / `--text-soft` / `--text-muted` | 近黑 / 深灰 / 灰 | 近白 / 浅灰 / 灰 | 三级文字 |
| `--accent-cyan` | `#1d4ed8` | `#60a5fa` | 链接、置顶标记 |
| `--glow-card` | `none` | `none` | 显式禁用卡片投影（别再用） |
| `--radius` / `--radius-sm` | `6px` / `4px` | 同 | 只剩代码块、图片、控件在用 |
| `--maxw` | `780px` | 同 | 文章页/单页正文列宽 |
| `--home-max` | `1000px` | 同 | 首页、归档、分类页容器宽 |
| `--header-h` | `52px` | 同 | 顶栏高度，被多处 `calc()` 引用 |
| `--font` | Noto Sans SC + system | 同 | 正文 |
| `--font-display` | Source Serif 4 / Noto Serif SC | 同 | 标题、月份、站点名 |

## 4. 版式规格

| 位置 | 规则 |
| --- | --- |
| 根字号 `html` | `18px`（原 17px）。全站 `rem` 尺寸跟着变，改这一处等于整体缩放 |
| 正文 `body` | `line-height: 1.8` |
| 文章正文 `.article-body` | `1.06rem`（≈19px）/ `line-height: 1.9` / `--text-soft` |
| 正文 h2 / h3 | `1.35rem` / `1.14rem`，`font-weight: 600`，负字距 `-0.01em` |
| 文章标题 `.page-title` | 衬线，`clamp(1.7rem, 3.4vw, 2.05rem)`，`600` |
| 首页条目标题 `.post-card h2` | 衬线，`1.34rem`（≤640px 时 `1.22rem`） |
| 列表摘要 `.post-excerpt` | `0.95rem`，2 行截断（`-webkit-line-clamp: 2`） |
| 元信息 `.post-meta` | `0.84rem`，`tabular-nums`，格式 `2026-11-07 · 分类 · 阅读需 N 分钟` |
| 归档正文 `--archive-font-size` | 默认 `0.95rem`，实际值来自 `source/_data/site_cms.yml` |
| 归档标题 `--archive-title-size` | 默认 `1.35rem`，同上 |
| 首页条目间距 | `padding: 1.7rem 0` + `border-bottom: 1px solid var(--border-faint)`，最后一条无线 |
| 归档文章间距 | `margin-bottom` + `padding-bottom` 各 `2.4rem` + 细线，最后一条清零 |
| 首页欢迎区 `.landing-page` | 不再占满一屏，`align-items: flex-end`，左对齐到 `--home-max` 列 |

## 5. 文件地图

```
themes/tony-blog/
├─ source/css/style.css              ← 95% 的样式都在这里（约 1400 行）
│  ├─ 顶部 :root / html[data-theme=dark]  ← 令牌
│  ├─ 「顶栏」段                      ← 实底、无毛玻璃
│  ├─ 「落地欢迎」段                  ← .landing-page/.landing-title/.landing-lead
│  ├─ 「博客区」段                    ← .home-shell/.archive-shell/.page-title
│  ├─ .post-list--home .post-card     ← 首页条目（扁平列表）
│  ├─ .post-meta / .post-excerpt      ← 元信息与摘要
│  ├─ .aside-block / .aside-cat-pill  ← 侧栏（透明化）
│  ├─ 「正文」段                      ← .article-body 字号、图片、代码块
│  ├─ 「页脚」段
│  └─ 「归档」段                      ← .archive-panel/.archive-filter/.archive-toc/.archive-full-*
│                                     以及文件最末尾的「窄屏微调」块
├─ layout/_partial/post-card.ejs     ← 首页/分类/标签页的文章条目（纯文字，无缩略图）
├─ layout/post.ejs                   ← 单篇文章页头部 meta
├─ layout/archive.ejs                ← 归档页结构 + 字号默认值
├─ layout/_partial/head.ejs          ← 深色壁纸遮罩（只有那一行 linear-gradient）
└─ layout/index.ejs                  ← 首页：欢迎区 + 列表 + 侧栏
```

改样式前先确认改的是**内容区**还是**控件**，再决定能不能上边框/圆角/投影。

目录（`.archive-toc`）只做"当前文章加粗高亮 + 目录自动滚动"，**没有**滚动指示箭头/标记元素；`source/js/archive-scroll-spy.js` 里不要再加回 `.archive-toc__marker`（已连同 CSS 一起删掉）。

## 6. 内容与状态约定（和后台一致）

| 状态 | 写在 md 里 | 渲染表现 |
| --- | --- | --- |
| 置顶 | `sticky: 1` | 排序靠前 + 标题前纯文字「置顶」 |
| 隐藏 | `meiso_private: true` | `scripts/private-posts.js` 让 Hexo 不生成 |
| 草稿 | 文件在 `source/_drafts/` | 不参与构建 |
| 日期 | `date: YYYY-MM-DD HH:mm:ss` 裸字符串 | 列表显示 `YYYY-MM-DD`，归档同 |

- 阅读时长 = `strip_html(content)` 去空白后长度 ÷ 400，向上取整，最小 1 分钟（`post-card.ejs` / `post.ejs` 内联计算）。
- 分类、标签文字来自 frontmatter，`tag-tone-*` 类还在但颜色已统一为 `--text-muted`，不要再按 tone 上色。

## 7. 三个容易踩的坑

1. **归档字号不是 CSS 说了算。** `archive.ejs` 读 `site.data.site_ui.archive.content_font_size / title_font_size / panel_bg_opacity`，这些值写在 `source/_data/site_cms.yml`（当前 0.95 / 1.35 / 0）。只改 CSS 默认值不生效——当初归档正文只有 11.9px 就是这里写了 `0.7`。后台「站点配置」页也会改这个文件。
2. **深色模式不是纯色底，是 `html` 上的一张固定壁纸。** 遮罩在 `head.ejs` 的 `<style id="dark-mode-bg-custom">` 里（当前 `rgba(10,10,16,.68)` → `rgba(10,10,18,.78)`）。所以深色下**不要**把内容区做成全透明再去赌对比度；正文区靠这层遮罩保证可读。压太狠会看不见极光，压太浅灰字（`--text-muted`）会糊。
3. **CSS 顺序。** 手机端覆盖块必须放在文件末尾（现在就是），否则会被后面 `.post-card h2` 之类的同权重规则盖掉。改完新增断点记得贴在最后。

## 8. 验证流程

```bash
cd mcblog_git_public
npx hexo generate -f --config _config.yml,_config.local.yml   # 必须 exit 0
npx http-server public -p 4020 -c-1                            # 或你惯用的静态服务
```

截图/回归脚本在后台工程里（用无头 Chrome）：

```bash
cd ../blog-admin
THEME=light W=1440 H=900 FULLPAGE=0 node scripts/site-shot.mjs http://127.0.0.1:4020 chk / /archives/
THEME=dark  W=390  H=844             node scripts/site-shot.mjs http://127.0.0.1:4020 m   /
```

截图落在 `blog-admin/.shots/`。检查点：

- 首页条目之间只有细线，没有盒子；
- 归档页筛选条、目录、文章都没有背景块与投影；
- 文章页正文 ≥ 19px，标题衬线且明显大于正文；
- 深色下正文与灰色元信息在壁纸上仍然清楚；
- 390px 宽度下：欢迎标题不炸行、侧栏在列表**之后**、归档标题 `1.2rem`；
- 控制台除 Cloudflare 统计（`cloudflareinsights.com`）跨域外无报错。

## 9. 回滚

```bash
cd mcblog_git_public
git checkout -- themes/tony-blog/source/css/style.css \
  themes/tony-blog/layout/_partial/post-card.ejs \
  themes/tony-blog/layout/_partial/head.ejs \
  themes/tony-blog/layout/post.ejs \
  themes/tony-blog/layout/archive.ejs \
  source/_data/site_cms.yml
```

（注意：这几个文件在本次改版前就已经有未提交改动，回滚会把它们一起还原到 HEAD，先 `git stash` 或备份更稳。）

## 10. 和 blog-admin 的分工

`blog-admin`（`mcblog_git/blog-admin`，端口 8780）只负责读写 md、改 frontmatter、跑 git。
它不做样式，也不解析主题；改版式只动本目录的 CSS/EJS，两边互不影响。
