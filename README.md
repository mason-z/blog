# Hexo 站点（tony-blog 主题）

本仓库**根目录即为 Hexo 项目**（`package.json`、`_config.yml`、`source/`、`themes/` 等均在根目录），便于推送到 GitHub/GitLab 后在 **任意静态托管**（Cloudflare Pages、Vercel、GitHub Pages、自有服务器等）上构建发布。

与 `src/index.html` 本地博客视觉对齐：浅色顶栏、居中欢迎区、博客卡片列表与侧栏。

## 一键生成 public（Windows）

**平常不用记一堆命令**：在仓库根目录执行 **`npm run build`**（或同义的 **`npm run site`** / **`npm run gen`**）即可；会先**自动同步** `source/admin` → `public/admin`，再检查数据、压缩宠物相关图片、生成 **`public/`**。Windows **一键生成**：双击根目录 **`build.bat`**（仅几 KB 脚本，不占额外空间；首次会自动 `npm install`）。**一键「先完整构建再预览」**：双击 **`preview-local.bat`**（或终端 **`npm run preview:local`**），流程与 `build.bat` 一致后再开 4001 预览。只想快速起服务、不先跑整条 build 时，用 **`npm run dev`** 或 **`npm run start`**（均为 **4001**，与 `_config.local.yml` 一致）。

## 使用

在**本仓库根目录**安装依赖并启动本地预览：

```bash
npm install
npm run dev
```

浏览器打开 **`http://localhost:4001`**。本地 **`npm run dev`** / **`start`** / **`preview`** 均已固定 **4001**，避免与 `_config.local.yml` 里 `http://localhost:4001` 不一致导致链接、书签打不开。

若提示 **端口已被占用**，关掉之前的 Hexo 终端，或换端口：`npm.cmd run server -- -p 4003 --config _config.yml,_config.local.yml`，并**同步**把 `_config.local.yml` 的 `url` 改成对应端口（例如 `http://localhost:4003`）。

### Windows cmd 注意

若项目在 **E 盘**，当前盘符是 **C 盘**，请用下面命令**同时切换盘符和目录**（只写 `cd E:\...` 时，工作目录可能仍在 C 盘，导致 `hexo` 读不到本目录的 `node_modules`）：

```bat
cd /d E:\desktop\pycode\本地博客
npm run server
```

PowerShell 可用：`Set-Location E:\desktop\pycode\本地博客`。

### PowerShell 提示「禁止运行脚本」/ npm.ps1

改用 **cmd 调用**（不经过 `.ps1`）：

```powershell
npm.cmd run server
```

或直接用 Hexo：

```powershell
.\node_modules\.bin\hexo.cmd server
```

也可打开 **命令提示符 (cmd.exe)** 再执行 `npm run server`。若希望长期允许本地脚本，可在 PowerShell（当前用户）执行：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

## 常用命令

（均在**仓库根目录**执行）

- `npm run server`：本地预览（推荐）  
- `npm run build`：生成 `public/`，配置与本地预览相同（合并 `_config.local.yml`）  
- `npm run build:prod`：仅用 `_config.yml` 生成，适合作为多数线上 CI 的构建命令（不合并 `_config.local.yml`）  
- `npm run dev:admin`：本地后台（Decap 代理 + Hexo **4001**，打开 `/admin`）；也可双击 **`start-admin-local.bat`**  
- `npx hexo new "文章标题"`：新建文章  
- `npm run gen:demo`（或 `node tools/gen-demo-posts.cjs`）：按需生成演示文章（`demo-01.md` … `demo-30.md`）。**若 `_posts` 里已有任意非 `demo-NN.md` 的正文，脚本会直接跳过**；默认只补全缺失的 demo；**全部覆盖**时用 `npm run gen:demo -- --force`。**勿**把本脚本放回 Hexo 的 `scripts/` 目录，否则会随 `hexo generate` 被加载并可能中断构建。

## 配置

- 站点：根目录 `_config.yml`  
- **全站名称、外观、界面文案与留言墙（合并为一份）**：`source/_data/site_cms.yml`，或在 **`/admin` →「全站与独立页面」→「站点配置」** 中编辑（一次保存可一并更新）  
- 本地预览覆盖：`_config.local.yml`（与主配置合并，覆盖 `url` 为本地地址）  
- 主题默认与后备：`themes/tony-blog/_config.yml`（线上/后台修改外观时写入 `site_cms.yml`，构建时优先于此处）  
- 文章封面：在 Markdown front-matter 中加 `cover: https://...`  

## 部署（静态托管）

构建产物为 **`public/`**，构建命令一般为：

```bash
npm install
npm run build:prod
```

`build` / `build:prod` 内部顺序：**每次执行 `validate` 前会自动 `sync:admin`**（不必手记）→ 健康检查 → **`compress:pet-images`**（默认只压宠物引用图；`COMPRESS_PET_IMAGES=all` 压全部 uploads）→ **`hexo generate`** → 最后再 **`sync:admin`** 收尾。一般**只跑 `npm run build` 即可**；若需单独检查数据可 **`npm run validate`**。

在托管平台中把 **发布目录** 设为 **`public`**。仓库根目录含 **`.nvmrc`**（Node **20**），便于 CI 与本地一致。部署前请在 **`_config.yml`** 里把 **`url`** 改成你的**真实站点地址**（含 `https://`，无末尾斜杠），并保持 **`root: /`**。

### Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers 与 Pages** → **Pages** → **创建应用程序** → 连接 **GitHub/GitLab** 并选中本仓库。  
2. **构建设置**（Build settings）：  
   - **框架预设**：无（None）  
   - **构建命令**：`npm run build:prod`  
   - **构建输出目录**：`public`  
   - **根目录**（项目路径）：留空或 `/`  
3. **环境变量**（可选）：若构建报 Node 版本问题，在项目的 **设置 → 环境变量** 中添加 **`NODE_VERSION`** = `20`（与 `.nvmrc` 一致）。  
4. 保存后等待首次构建；站点地址形如 **`https://<项目名>.pages.dev`**，也可在 **自定义域** 里绑定自己的域名。  
5. 将 **`_config.yml`** 中的 **`url`** 改为上述 **https** 地址（自定义域则填你的域名）。

构建日志可在该 Pages 项目的 **部署** 标签页查看；推送新 commit 会触发重新构建。

## Decap CMS 后台（网页编辑文章）

博客主题**导航里不显示**后台入口；管理地址为：**`https://你的域名/admin`**（部署后与本地 `public/admin` 一致）。

后台里可编辑内容（保存后刷新本地预览即可）：**「全站与独立页面」**（**站点配置** 合并名称/外观/全站文案/留言墙，对应 `source/_data/site_cms.yml`；以及关于、近况、分类页、留言墙补充正文等独立页面）、**「旅行地图」**、**「博客文章」**。站点技术项（如 `url`、`root`）仍在根目录 `_config.yml` 手动改，避免误操作。

1. 编辑 **`source/admin/config.yml`**：将 **`repo`** 改成你的 GitHub 仓库（格式 `用户名/仓库名`），**`branch`** 与默认分支一致（一般为 `main`）。**`base_url`** 须与你在浏览器里打开后台的站点 **完全一致**（例如 `https://masonblog.pages.dev`，若只用自定义域则改成 `https://你的域名`，不要混用）。  
2. **Cloudflare Pages（本仓库方式）**：默认的 `https://api.netlify.com/auth` 在 CF 上会 **404**，因此仓库根目录已提供 **`functions/auth.ts`** 与 **`functions/callback.ts`** 作为 GitHub OAuth 代理（与 [decap-proxy](https://github.com/sterlingwes/decap-proxy) 同类逻辑）。部署后请在 **Cloudflare Pages → 你的项目 → 设置 → 环境变量** 中添加（**加密**推荐）：  
   - **`GITHUB_OAUTH_ID`**：GitHub OAuth App 的 Client ID  
   - **`GITHUB_OAUTH_SECRET`**：Client Secret  
   若仓库为 **私有**，再增加 **`GITHUB_REPO_PRIVATE`** = `1`（与 Functions 内 scope 一致）。  
3. 在 **GitHub → Settings → Developer settings → OAuth Apps** 中编辑（或新建）应用：**Homepage URL** 填你的站点根地址；**Authorization callback URL** 填 **`https://<与 base_url 相同的域名>/callback`**（示例：`https://masonblog.pages.dev/callback`）。若同时使用 `*.pages.dev` 与自定义域访问后台，可在 GitHub 里 **添加多条** callback。  
4. 推送代码让 Pages 重新部署后，打开 **`https://你的域名/admin/`**，再点 **Log in with GitHub**。保存会提交到 Git 远程，是否触发构建取决于 CF Pages 与分支设置。

图片上传目录为 **`source/images/uploads`**，构建后访问路径为 **`/images/uploads/...`**。

### 本地使用后台（无需 GitHub 登录）

`config.yml` 里已开启 **`local_backend: true`**：在 **本机** 打开后台时，会通过 **`decap-server`** 直接读写你电脑上的仓库文件并 **Git 提交**（`MODE=git`），不经过 OAuth。

1. 在项目根目录执行 **`npm install`**（已含 `decap-server`、`concurrently` 等）。
2. 任选一种方式：
   - 双击 **`start-admin-local.bat`**（约 3 秒后会尝试打开浏览器）；或
   - 终端执行 **`npm run dev:admin`**（会并行启动：Decap 代理 **8081** + Hexo **4001**）。
3. **等终端出现** `Hexo is running at http://localhost:4001/` **之后**，再打开：**`http://localhost:4001/admin/`**（**建议带末尾 `/`**，或用 **`/admin/index.html`**）。保存后变更在本地 Git 仓库中；需要时再 `git push` 到 GitHub。

**若打不开或白屏：** ① 确认 **4001** 与 **8081** 未被其它程序占用；② 不要用「仅预览」却未开终端——必须 **`dev:admin` 或 `server:4001` 正在运行**；③ 白屏多为 **Decap 脚本 CDN 被拦截**，已优先使用 jsDelivr，可换网络或代理后再试。

若 8081 被占用，可在项目根目录建 **`.env`**，写入 `PORT=8083`（或其它端口），并参阅 [Decap 本地仓库文档](https://decapcms.org/docs/working-with-a-local-git-repository/) 在 `config.yml` 里为 `local_backend` 配置对应 `url`。

**线上** `/admin` 使用 **GitHub + OAuth**（见上一节）；`local_backend` 仅在访问 **localhost / 127.0.0.1** 时走本机 `decap-server`，不经过线上 OAuth。

## 说明

文章为 `source/_posts/` 下的 `.md` 文件，与原先浏览器 `localStorage` 版数据不互通；需自行迁移或复制内容。

若本地仍看到空的 **`hexo-site`** 文件夹，多为 IDE 占用导致无法删除，**关闭相关窗口后手动删除**即可（内容已全部移到仓库根目录）。
