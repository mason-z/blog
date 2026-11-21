package com.meiso.quicknote

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore

object GalleryPicker {

    fun isHarmonyOrHuawei(): Boolean {
        val m = Build.MANUFACTURER.orEmpty()
        val b = Build.BRAND.orEmpty()
        val display = Build.DISPLAY.orEmpty()
        val version = Build.VERSION.RELEASE.orEmpty()
        return m.contains("HUAWEI", true) ||
            m.contains("HONOR", true) ||
            b.contains("HUAWEI", true) ||
            b.contains("HONOR", true) ||
            display.contains("Harmony", true) ||
            version.contains("Harmony", true)
    }

    /** 优先唤起系统图库（鸿蒙 / 华为 / 通用回落） */
    fun createPickIntent(context: Context, maxCount: Int): Intent {
        val pm = context.packageManager
        val limit = maxCount.coerceIn(1, 30)

        if (Build.VERSION.SDK_INT >= 33) {
            val pickImages = Intent(MediaStore.ACTION_PICK_IMAGES).apply {
                putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, limit)
            }
            if (pickImages.resolveActivity(pm) != null) return pickImages
        }

        val galleryPackages = listOf(
            "com.huawei.photos",
            "com.hihonor.photos",
            "com.android.gallery3d",
            "com.miui.gallery",
            "com.vivo.gallery",
            "com.oppo.gallery",
            "com.google.android.apps.photos",
        )
        for (pkg in galleryPackages) {
            val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                type = "image/*"
                setPackage(pkg)
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, limit > 1)
            }
            if (intent.resolveActivity(pm) != null) return intent
        }

        return Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
            type = "image/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, limit > 1)
        }
    }

    fun parseUris(data: Intent?): List<Uri> {
        if (data == null) return emptyList()
        val clip = data.clipData
        if (clip != null && clip.itemCount > 0) {
            return (0 until clip.itemCount).mapNotNull { clip.getItemAt(it)?.uri }
        }
        data.data?.let { return listOf(it) }
        return emptyList()
    }
}
