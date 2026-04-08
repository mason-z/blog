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
- `npm run build`：生成 `public/` 静态文件  
- `npx hexo new "文章标题"`：新建文章  
- `node scripts/gen-demo-posts.cjs`：生成 30 篇演示文章（`demo-01.md` … `demo-30.md`，可删后自用）

## 配置

- 站点：根目录 `_config.yml`  
- 本地预览覆盖：`_config.local.yml`（与主配置合并，已设 `root: /`，避免与线上子路径冲突）  
- 主题文案与导航：`themes/tony-blog/_config.yml`（`landing_title` / `landing_lead` / `menu`）  
- 文章封面：在 Markdown front-matter 中加 `cover: https://...`  

## Netlify

仓库根目录已含 **`netlify.toml`**：构建命令 `npm run build`，发布目录 **`public/`**。在 Netlify 导入本仓库时 **Base directory 留空** 即可。

部署前请在 `_config.yml` 中将 **`url`**、**`root`** 改为你的 Netlify 域名（一般为 `https://<站点名>.netlify.app` 且 `root: /`）。

## 部署到 Gitee Pages（仓库：zhangmingcong/mc）

线上地址已配置为：**https://zhangmingcong.gitee.io/mc/**（`url` + `root: /mc/`）。

1. 将**本仓库**推送到 **`master`**（或你的主开发分支），与 Hexo 源码一起保存。  
2. 本地安装依赖后执行：
   ```bat
   npm.cmd install
   npm.cmd run deploy
   ```
   会把 `public/` 推到远程分支 **`gitee-pages`**（首次需在 Gitee 用**私人令牌**或 SSH，按提示输入账号密码）。  
3. 打开 Gitee 仓库 → **服务 → Gitee Pages**，发布分支选 **`gitee-pages`**，目录 **`/`**，保存。  
4. 若样式路径不对，检查 `_config.yml` 里 `url`、`root` 是否与 Gitee 给你的地址一致（项目页一般为 `/仓库名/`）。

**说明：** `npm run deploy` 只使用 `_config.yml` 生成，不会合并 `_config.local.yml`，保证线上资源路径正确。

## 说明

文章为 `source/_posts/` 下的 `.md` 文件，与原先浏览器 `localStorage` 版数据不互通；需自行迁移或复制内容。

若本地仍看到空的 **`hexo-site`** 文件夹，多为 IDE 占用导致无法删除，**关闭相关窗口后手动删除**即可（内容已全部移到仓库根目录）。
