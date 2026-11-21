# meiso 本地管理界面

参考 **waveform-manager** 同款架构：**Vue 3 + Vite + Tailwind** 前端，**Node Express** 后端，直接读写博客 `source/` 文件。

不依赖 Decap CMS，无需 GitHub 登录，适合本地编辑。

## 功能

- **博客文章**：列表、搜索、分类/标签筛选、新建/编辑/删除 Markdown 文章
- **站点配置**：编辑 `source/_data/site_cms.yml`
- **媒体上传**：写入 **`assets/`**（不进 Git），正文插入 **`../../assets/文件名`**
- **构建站点**：调用根目录 `npm run build`；发布用根目录 **`npm run deploy`**
- **手机通道**：浏览 `sync-phone-channel.config.json` 的 Sync 目录（朋友圈式列表），多选/日期/全部删除，选中导入博客或一键全量同步
- **左侧「同步与发布」**：一键部署、同步通道、扫描、本地/线上构建、打开线上站点；**发布日志**页看详细状态与命令输出

## 启动

```bash
npm run manage:install
npm run manage:dev
```

浏览器：**http://127.0.0.1:5174/**（API **8770**）

## 图片（方案 3）

| 目录 | 用途 |
|------|------|
| `assets/` | 原图，Obsidian / manage 共用，**不 commit** |
| `source/images/web/` | 构建生成的压缩网页图，**不 commit** |
| 线上 | `/images/web/...`（`npm run deploy` 上传 `public/`） |

插入图片后 Markdown 为相对路径；本地预览需先 `npm run build` 才能在 Hexo 里看到 `/images/web/` 版本。

## 配置

`manage/config.json`：`blogRoot` 默认 `..`
