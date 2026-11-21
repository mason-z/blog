# meiso 随手记（Android · 朋友圈风）

在手机上写图文，**直接保存到你选的文件夹**（配合 Syncthing 同步到电脑博客目录）。  
不依赖家里电脑在线、不需要 IP 和 API。

## 界面

- 灰底信息流 + 白卡片（类似朋友圈）
- 顶部「说点什么…」/ 相机进入发表
- 多图网格每行 5 张（最多 30 张，点击放大可左右切换）
- 发现页 ⋮：**多选删除**、**按日期区间删除**、**全部删除**（仅本机同步目录内文件）
- **发表** → 写入 `posts/` 子目录  
- **存草稿** → 写入 `drafts/` 子目录  
- 图片均写入 `assets/` 子目录，Markdown 使用 `../../assets/文件名`（与 Hexo manage 一致）

## 存储路径（必设）

1. 打开 App → 右上角文件夹图标 → **选择文件夹**  
2. 选 Syncthing 同步目录，例如手机上 `Sync/blog`  
3. 在设置里可把子目录改成与电脑一致：
   - 草稿：`drafts` 或对接 `source/_drafts` 的同步名  
   - 发表：`posts` 或对接 `source/_posts`  
   - 图片：`assets`  

### Syncthing 对照示例

| 手机（所选根目录下） | 电脑 `mcblog_git_public` |
|----------------------|---------------------------|
| `drafts/*.md` | `source/_drafts/` |
| `posts/*.md` | `source/_posts/` |
| `assets/*` | `assets/` |

同步到电脑通道目录（默认 `E:\手机博客通道sync`）后：

- 仅本地构建：双击 **`publish-phone-sync.bat`**
- 构建并上线：双击 **`publish-phone-sync-online.bat`**（或 `npm run publish:phone`）

配置路径：博客根目录 `tools/sync-phone-channel.config.json`

## 构建 APK

```bat
cd manage-android
gradlew.bat assembleDebug
```

输出：`app\build\outputs\apk\debug\app-debug.apk`  

也可双击仓库根目录 `build-android-apk.bat`（需能下载 Gradle，或已缓存）。

首次构建需要 **Android SDK** + **JDK 17**，见 `local.properties` 中的 `sdk.dir`。

## 与局域网 manage API 版

当前版本为 **纯本地写文件**；`manage` 的 API 密钥仅用于电脑浏览器后台，手机 App 不再使用。
