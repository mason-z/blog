package com.meiso.quicknote

import android.content.Context
import android.net.Uri

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("meiso_quicknote", Context.MODE_PRIVATE)

    var syncRootUri: String
        get() = sp.getString(KEY_SYNC_ROOT, "") ?: ""
        set(value) = sp.edit().putString(KEY_SYNC_ROOT, value).apply()

    /** 相对同步根目录：草稿 */
    var draftsDirName: String
        get() = sp.getString(KEY_DRAFTS_DIR, "drafts") ?: "drafts"
        set(value) = sp.edit().putString(KEY_DRAFTS_DIR, value.trim().ifBlank { "drafts" }).apply()

    /** 相对同步根目录：直接发表（对应 source/_posts） */
    var postsDirName: String
        get() = sp.getString(KEY_POSTS_DIR, "posts") ?: "posts"
        set(value) = sp.edit().putString(KEY_POSTS_DIR, value.trim().ifBlank { "posts" }).apply()

    var assetsDirName: String
        get() = sp.getString(KEY_ASSETS_DIR, "assets") ?: "assets"
        set(value) = sp.edit().putString(KEY_ASSETS_DIR, value.trim().ifBlank { "assets" }).apply()

    fun syncRoot(): Uri? {
        val s = syncRootUri
        if (s.isBlank()) return null
        return Uri.parse(s)
    }

    companion object {
        private const val KEY_SYNC_ROOT = "sync_root_uri"
        private const val KEY_DRAFTS_DIR = "drafts_dir"
        private const val KEY_POSTS_DIR = "posts_dir"
        private const val KEY_ASSETS_DIR = "assets_dir"
    }
}
