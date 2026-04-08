# Hexo 站点（tony-blog 主题）

本仓库**根目录即为 Hexo 项目**（`package.json`、`_config.yml`、`source/`、`themes/` 等均在根目录），便于推送到 GitHub/GitLab 后在 **Netlify** 等平台一键构建。

与 `src/index.html` 本地博客视觉对齐：浅色顶栏、居中欢迎区、博客卡片列表与侧栏。

## 一键预览（Windows）

双击 **`start-hexo-preview.bat`**：会自动 `npm install`（仅首次）、在 **4001** 端口启动并打开浏览器。关掉黑色窗口即停止服务。

## 使用

在**本仓库根目录**安装依赖并启动：

```bash
npm install
npm run server
```

浏览器打开提示的地址（默认 `http://localhost:4000`）。

若提示 **Port 4000 has been used**，先关掉之前开的 Hexo 终端，或换端口：

```bat
npm.cmd run server:4001
```

也可：`npm.cmd run server -- -p 4001`（任意未被占用端口均可）。

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
- `npm run build:prod`：仅用 `_config.yml` 生成，与 Netlify 线上构建一致  
- `npm run dev:admin`：本地后台（Decap 代理 + Hexo **4001**，打开 `/admin`）；也可双击 **`start-admin-local.bat`**  
- `npx hexo new "文章标题"`：新建文章  
- `node scripts/gen-demo-posts.cjs`：按需生成演示文章（`demo-01.md` … `demo-30.md`）。**若 `_posts` 里已有任意非 `demo-NN.md` 的正文，脚本会直接跳过**；默认只补全缺失的 demo，不覆盖已有文件；**全部覆盖**时用 `node scripts/gen-demo-posts.cjs --force`

## 配置

- 站点：根目录 `_config.yml`  
- 本地预览覆盖：`_config.local.yml`（与主配置合并，覆盖 `url` 为本地地址）  
- 主题文案与导航：`themes/tony-blog/_config.yml`（`landing_title` / `landing_lead` / `menu`）  
- 文章封面：在 Markdown front-matter 中加 `cover: https://...`  

## Netlify（GitHub 联通）

仓库根目录已含 **`netlify.toml`**：构建命令 **`npm run build:prod`**，发布目录 **`public/`**。在 Netlify 关联本 GitHub 仓库时 **Base directory 留空** 即可。

部署前在 **`_config.yml`** 里把 **`url`** 改成你的站点地址（例如 `https://<站点名>.netlify.app`，或已绑定的自定义域名），并保持 **`root: /`**（与 Netlify 在域名根目录发布一致）。

## Decap CMS 后台（网页编辑文章）

博客主题**导航里不显示**后台入口；管理地址为：**`https://你的域名/admin`**（部署后与本地 `public/admin` 一致）。

后台里可编辑内容（保存后刷新本地预览即可）：**「网站外观」**（首页大标题/引言、顶栏品牌、导航、页脚）、**「全站界面文案」**（首页「文库共/本页」、侧栏标题、分类页与归档页用语、分页「上/下一页」、顶栏无障碍文案等，对应 `source/_data/site_ui.yml`）、**「独立页面」**（关于、近况、分类页 front-matter 与正文），以及 **「博客文章」**。站点技术项（如 `url`、`root`）仍在根目录 `_config.yml` 手动改，避免误操作。

1. 编辑 **`source/admin/config.yml`**：将 **`repo`** 改成你的 GitHub 仓库（格式 `用户名/仓库名`），**`branch`** 与默认分支一致（一般为 `main`）。  
2. 在 **GitHub** → Settings → Developer settings → OAuth Apps → 新建：  
   - **Homepage URL**：你的 Netlify 站点，如 `https://xxx.netlify.app`  
   - **Authorization callback URL**：固定填 **`https://api.netlify.com/auth/dispatch`**  
   记下 **Client ID**，并生成 **Client secrets**。  
3. 在 **Netlify** 站点 → **Site configuration** → **Access & security** → **OAuth**（或旧版 **Site settings → Access control → OAuth**）→ 启用 **GitHub**，填入上面的 ID 与 Secret。  
4. 保存后打开 **`https://你的域名/admin`**，用 GitHub 登录即可编辑 **`source/_posts`** 下的文章；保存会提交到仓库并触发 Netlify 重新构建。

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

**线上 Netlify** 仍使用 **GitHub + OAuth**（见上一节）；`local_backend` 仅在访问 **localhost / 127.0.0.1** 时生效。

## 说明

文章为 `source/_posts/` 下的 `.md` 文件，与原先浏览器 `localStorage` 版数据不互通；需自行迁移或复制内容。

若本地仍看到空的 **`hexo-site`** 文件夹，多为 IDE 占用导致无法删除，**关闭相关窗口后手动删除**即可（内容已全部移到仓库根目录）。
