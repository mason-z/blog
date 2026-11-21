package com.meiso.quicknote

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import java.io.BufferedReader
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LocalMoment(
    val id: String,
    val title: String,
    val body: String,
    val imageNames: List<String>,
    val createdAt: Long,
    val isDraft: Boolean,
)

class LocalBlogStore(private val context: Context, private val prefs: Prefs) {

    fun hasRoot(): Boolean = prefs.syncRoot() != null

    fun rootLabel(): String {
        val root = prefs.syncRoot() ?: return "未选择目录"
        val doc = DocumentFile.fromTreeUri(context, root) ?: return "无效目录"
        return doc.name ?: root.lastPathSegment ?: "已选目录"
    }

    private fun rootDir(): DocumentFile? {
        val uri = prefs.syncRoot() ?: return null
        return DocumentFile.fromTreeUri(context, uri)
    }

    private fun ensureChildDir(parent: DocumentFile, name: String): DocumentFile? {
        val existing = parent.findFile(name)
        if (existing != null && existing.isDirectory) return existing
        return parent.createDirectory(name)
    }

    fun draftsDir(): DocumentFile? {
        val root = rootDir() ?: return null
        return ensureChildDir(root, prefs.draftsDirName)
    }

    fun postsDir(): DocumentFile? {
        val root = rootDir() ?: return null
        return ensureChildDir(root, prefs.postsDirName)
    }

    fun assetsDir(): DocumentFile? {
        val root = rootDir() ?: return null
        return ensureChildDir(root, prefs.assetsDirName)
    }

    fun listMoments(): List<LocalMoment> {
        val items = mutableListOf<LocalMoment>()
        draftsDir()?.let { items += listInDir(it, isDraft = true) }
        postsDir()?.let { items += listInDir(it, isDraft = false) }
        return items.sortedByDescending { it.createdAt }
    }

    fun momentKey(moment: LocalMoment): String = "${moment.isDraft}_${moment.id}"

    data class DeleteBatchResult(val deleted: Int, val failed: Int)

    fun deleteMoment(moment: LocalMoment): Boolean {
        val dir = (if (moment.isDraft) draftsDir() else postsDir()) ?: return false
        val file = dir.findFile(moment.id) ?: return false
        if (!file.delete()) return false
        deleteAssetFiles(moment.imageNames)
        return true
    }

    fun deleteMoments(moments: List<LocalMoment>): DeleteBatchResult {
        var deleted = 0
        var failed = 0
        for (m in moments) {
            if (deleteMoment(m)) deleted++ else failed++
        }
        return DeleteBatchResult(deleted, failed)
    }

    /** 闭区间 [rangeStart, rangeEnd]，按文章 date / 文件时间 */
    fun deleteMomentsInRange(rangeStart: Long, rangeEnd: Long): DeleteBatchResult {
        val lo = minOf(rangeStart, rangeEnd)
        val hi = maxOf(rangeStart, rangeEnd)
        val targets = listMoments().filter { it.createdAt in lo..hi }
        return deleteMoments(targets)
    }

    fun deleteAllMoments(): DeleteBatchResult = deleteMoments(listMoments())

    private fun deleteAssetFiles(imageNames: List<String>) {
        val assets = assetsDir() ?: return
        for (raw in imageNames) {
            val base = raw.substringAfterLast('/')
            assets.findFile(base)?.delete()
        }
    }

    private fun listInDir(dir: DocumentFile, isDraft: Boolean): List<LocalMoment> {
        return dir.listFiles()
            .filter { it.isFile && it.name?.endsWith(".md", ignoreCase = true) == true }
            .mapNotNull { file -> parseMoment(file, isDraft) }
    }

    private fun parseMoment(file: DocumentFile, isDraft: Boolean): LocalMoment? {
        val text = readText(file) ?: return null
        val (fm, body) = splitFrontMatter(text)
        val title = fm["title"] ?: file.name?.removeSuffix(".md").orEmpty()
        val dateStr = fm["date"] ?: ""
        val created = parseDate(dateStr) ?: file.lastModified()
        val images = parseImageNames(body)
        val textOnly = displayTextFromBody(body)
        return LocalMoment(
            id = file.name ?: return null,
            title = title,
            body = textOnly,
            imageNames = images,
            createdAt = created,
            isDraft = isDraft,
        )
    }

    fun assetUri(fileName: String): Uri? {
        val assets = assetsDir() ?: return null
        val base = fileName.substringAfterLast('/')
        val f = assets.findFile(base) ?: return null
        return f.uri
    }

    fun saveMoment(text: String, imageUris: List<Uri>, publish: Boolean): Result<LocalMoment> {
        val targetDir: DocumentFile = (if (publish) postsDir() else draftsDir())
            ?: return Result.failure(IllegalStateException("请先选择存储目录"))
        val assetsFolder: DocumentFile = this.assetsDir()
            ?: return Result.failure(IllegalStateException("无法创建 assets 目录"))

        return runCatching {
            val now = Date()
            val stamp = FILE_STAMP.format(now)
            val imageNames = mutableListOf<String>()
            imageUris.forEachIndexed { i, src ->
                val ext = extensionFromUri(src)
                val name = "m-$stamp-${i + 1}.$ext"
                copyUriToAsset(assetsFolder, src, name, ext)
                imageNames.add(name)
            }

            val iso = HEXO_DATE.format(now)
            val title = "${DISPLAY_STAMP.format(now)} 随手记"
            val bodyParts = mutableListOf<String>()
            val trimmed = text.trim()
            if (trimmed.isNotEmpty()) bodyParts.add(trimmed)
            if (imageNames.isNotEmpty()) {
                bodyParts.add(buildPhotoGridHtml(imageNames))
            }
            val body = bodyParts.joinToString("\n\n").ifBlank { " " }

            val fm = buildString {
                append("---\n")
                append("title: ").append(title).append('\n')
                append("date: ").append(iso).append('\n')
                append("categories: [随笔]\n")
                append("tags: [手机]\n")
                append("---\n")
            }
            val content = fm + body

            val slug = "moment-$stamp"
            val mdName = "$slug.md"
            val existing = targetDir.findFile(mdName)
            val mdFile = existing ?: targetDir.createFile("text/markdown", mdName)
                ?: throw IllegalStateException("无法创建文章文件")

            context.contentResolver.openOutputStream(mdFile.uri, "wt").use { out ->
                out?.write(content.toByteArray(Charsets.UTF_8))
            }

            LocalMoment(
                id = mdName,
                title = title,
                body = trimmed,
                imageNames = imageNames,
                createdAt = now.time,
                isDraft = !publish,
            )
        }
    }

    private fun copyUriToAsset(assets: DocumentFile, src: Uri, name: String, ext: String) {
        val mime = when (ext.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            else -> "image/jpeg"
        }
        val outFile = assets.findFile(name) ?: assets.createFile(mime, name)
            ?: throw IllegalStateException("无法写入图片")
        context.contentResolver.openInputStream(src).use { input ->
            context.contentResolver.openOutputStream(outFile.uri, "w").use { output ->
                if (input == null || output == null) throw IllegalStateException("图片读写失败")
                input.copyTo(output)
            }
        }
    }

    private fun extensionFromUri(uri: Uri): String {
        val type = context.contentResolver.getType(uri)?.lowercase().orEmpty()
        return when {
            type.contains("png") -> "png"
            type.contains("webp") -> "webp"
            type.contains("gif") -> "gif"
            else -> "jpg"
        }
    }

    private fun readText(file: DocumentFile): String? {
        return context.contentResolver.openInputStream(file.uri)?.use { ins ->
            BufferedReader(InputStreamReader(ins, Charsets.UTF_8)).readText()
        }
    }

    private fun splitFrontMatter(raw: String): Pair<Map<String, String>, String> {
        if (!raw.startsWith("---")) return emptyMap<String, String>() to raw
        val end = raw.indexOf("\n---", 3)
        if (end < 0) return emptyMap<String, String>() to raw
        val block = raw.substring(3, end).trim()
        val body = raw.substring(end + 4).trimStart()
        val map = block.lines().mapNotNull { line ->
            val idx = line.indexOf(':')
            if (idx <= 0) return@mapNotNull null
            line.substring(0, idx).trim() to line.substring(idx + 1).trim()
        }.toMap()
        return map to body
    }

    private fun parseDate(s: String): Long? {
        return try {
            HEXO_DATE.parse(s)?.time
        } catch (_: Exception) {
            null
        }
    }

    private fun parseImageNames(body: String): List<String> {
        val fromGrid = PHOTO_GRID_IMG_RE.findAll(body).map { it.groupValues[1] }.toList()
        if (fromGrid.isNotEmpty()) return fromGrid
        return IMAGE_MD_RE.findAll(body).map { it.groupValues[1] }.toList()
    }

    private fun displayTextFromBody(body: String): String {
        var s = body.replace(PHOTO_GRID_BLOCK_RE, "")
        s = s.lines().filterNot { line ->
            val t = line.trim()
            IMAGE_MD_RE.containsMatchIn(t) || t.startsWith("<div class=\"photo-grid")
        }.joinToString("\n")
        return s.trim()
    }

    private fun buildPhotoGridHtml(names: List<String>): String {
        val cells = names.joinToString("\n") { n ->
            """    <figure class="photo-grid__cell"><img src="../../assets/$n" alt="" loading="lazy" decoding="async" /></figure>"""
        }
        return """
<div class="photo-grid photo-grid--${PHOTO_GRID_COLS} photo-grid--size-m">
$cells
</div>
        """.trimIndent()
    }

    companion object {
        const val MAX_IMAGES = 30
        const val PHOTO_GRID_COLS = 5

        private val FILE_STAMP = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US)
        private val DISPLAY_STAMP = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val HEXO_DATE = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

        private val IMAGE_MD_RE = Regex("""!\[\]\(\.\./\.\./assets/([^)]+)\)""")
        private val PHOTO_GRID_IMG_RE =
            Regex("""<img\s+[^>]*src="(?:\.\./\.\./assets/)?([^"]+)"""")
        private val PHOTO_GRID_BLOCK_RE =
            Regex("""<div class="photo-grid[\s\S]*?</div>""", RegexOption.IGNORE_CASE)
    }
}
