package com.meiso.quicknote

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.meiso.quicknote.ui.ConfirmDeleteDialog
import com.meiso.quicknote.ui.DateRangeDeleteDialog
import com.meiso.quicknote.ui.MomentImageGrid
import com.meiso.quicknote.ui.MomentsColorsExt
import com.meiso.quicknote.ui.MomentsTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private enum class Screen { Feed, Compose, Settings }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MomentsTheme {
                MomentApp()
            }
        }
    }
}

@Composable
private fun MomentApp() {
    val context = LocalContext.current
    val prefs = remember { Prefs(context) }
    val store = remember { LocalBlogStore(context, prefs) }
    val scope = rememberCoroutineScope()

    var screen by remember { mutableStateOf(Screen.Feed) }
    var moments by remember { mutableStateOf<List<LocalMoment>>(emptyList()) }
    var toast by remember { mutableStateOf("") }

    fun reload() {
        scope.launch {
            moments = withContext(Dispatchers.IO) { store.listMoments() }
        }
    }

    LaunchedEffect(prefs.syncRootUri, screen) {
        if (store.hasRoot()) reload()
    }

    val treePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        try {
            context.contentResolver.takePersistableUriPermission(uri, flags)
            prefs.syncRootUri = uri.toString()
            toast = "已选择：${store.rootLabel()}"
            reload()
        } catch (e: Exception) {
            toast = e.message ?: "无法保存目录权限"
        }
    }

    when (screen) {
        Screen.Feed -> FeedScreen(
            store = store,
            moments = moments,
            toast = toast,
            onDismissToast = { toast = "" },
            onCompose = { screen = Screen.Compose },
            onSettings = { screen = Screen.Settings },
            onRefresh = { reload() },
            onNotify = { toast = it },
        )

        Screen.Compose -> ComposeScreen(
            store = store,
            onBack = { screen = Screen.Feed },
            onPublished = { msg ->
                toast = msg
                reload()
                screen = Screen.Feed
            },
        )

        Screen.Settings -> SettingsScreen(
            prefs = prefs,
            store = store,
            onPickFolder = { treePicker.launch(null) },
            onBack = { screen = Screen.Feed },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun FeedScreen(
    store: LocalBlogStore,
    moments: List<LocalMoment>,
    toast: String,
    onDismissToast: () -> Unit,
    onCompose: () -> Unit,
    onSettings: () -> Unit,
    onRefresh: () -> Unit,
    onNotify: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var selectionMode by remember { mutableStateOf(false) }
    val selectedKeys = remember { mutableStateListOf<String>() }
    var showManageMenu by remember { mutableStateOf(false) }
    var showDateRangeDialog by remember { mutableStateOf(false) }
    var showConfirmMulti by remember { mutableStateOf(false) }
    var showConfirmAll by remember { mutableStateOf(false) }

    fun clearSelection() {
        selectionMode = false
        selectedKeys.clear()
    }

    fun toggleKey(key: String) {
        if (key in selectedKeys) selectedKeys.remove(key) else selectedKeys.add(key)
    }

    fun enterSelection(initialKey: String? = null) {
        selectionMode = true
        selectedKeys.clear()
        if (initialKey != null) selectedKeys.add(initialKey)
    }

    fun runDelete(block: () -> LocalBlogStore.DeleteBatchResult) {
        scope.launch {
            val r = withContext(Dispatchers.IO) { block() }
            val msg = when {
                r.deleted == 0 && r.failed == 0 -> "没有可删除的内容"
                r.failed > 0 -> "已删除 ${r.deleted} 条，${r.failed} 条失败"
                else -> "已删除 ${r.deleted} 条"
            }
            onNotify(msg)
            clearSelection()
            onRefresh()
        }
    }

    if (showConfirmMulti) {
        ConfirmDeleteDialog(
            title = "删除所选",
            message = "确定删除已选的 ${selectedKeys.size} 条记录？将同时删除对应图片文件（仅本机同步目录）。",
            onDismiss = { showConfirmMulti = false },
            onConfirm = {
                showConfirmMulti = false
                val keys = selectedKeys.toSet()
                val targets = moments.filter { store.momentKey(it) in keys }
                runDelete { store.deleteMoments(targets) }
            },
        )
    }

    if (showConfirmAll) {
        ConfirmDeleteDialog(
            title = "全部删除",
            message = "确定删除同步目录内全部 ${moments.size} 条草稿与已发表记录？此操作不可恢复。",
            onDismiss = { showConfirmAll = false },
            onConfirm = {
                showConfirmAll = false
                runDelete { store.deleteAllMoments() }
            },
        )
    }

    if (showDateRangeDialog) {
        DateRangeDeleteDialog(
            momentCountInRange = { lo, hi ->
                moments.count { it.createdAt in lo..hi }
            },
            onDismiss = { showDateRangeDialog = false },
            onConfirm = { lo, hi ->
                showDateRangeDialog = false
                runDelete { store.deleteMomentsInRange(lo, hi) }
            },
        )
    }

    Scaffold(
        containerColor = MomentsColorsExt.pageBackground,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (selectionMode) "已选 ${selectedKeys.size} 条" else "发现",
                    )
                },
                navigationIcon = {
                    if (selectionMode) {
                        IconButton(onClick = { clearSelection() }) {
                            Icon(Icons.Default.Close, contentDescription = "取消多选")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
                actions = {
                    if (selectionMode) {
                        TextButton(
                            onClick = {
                                if (selectedKeys.size == moments.size) {
                                    selectedKeys.clear()
                                } else {
                                    selectedKeys.clear()
                                    moments.forEach { selectedKeys.add(store.momentKey(it)) }
                                }
                            },
                        ) {
                            Text(
                                if (selectedKeys.size == moments.size && moments.isNotEmpty()) "取消全选" else "全选",
                                color = MomentsColorsExt.wechatGreen,
                            )
                        }
                        IconButton(
                            onClick = {
                                if (selectedKeys.isNotEmpty()) showConfirmMulti = true
                            },
                            enabled = selectedKeys.isNotEmpty(),
                        ) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "删除所选",
                                tint = if (selectedKeys.isNotEmpty()) Color(0xFFE54D42) else MomentsColorsExt.textSecondary,
                            )
                        }
                    } else {
                        Box {
                            IconButton(onClick = { showManageMenu = true }) {
                                Icon(Icons.Default.MoreVert, contentDescription = "管理")
                            }
                            DropdownMenu(expanded = showManageMenu, onDismissRequest = { showManageMenu = false }) {
                                DropdownMenuItem(
                                    text = { Text("多选删除") },
                                    onClick = {
                                        showManageMenu = false
                                        enterSelection()
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text("按日期区间删除") },
                                    onClick = {
                                        showManageMenu = false
                                        showDateRangeDialog = true
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text("全部删除") },
                                    onClick = {
                                        showManageMenu = false
                                        showConfirmAll = true
                                    },
                                )
                            }
                        }
                        IconButton(onClick = onSettings) {
                            Icon(Icons.Default.FolderOpen, contentDescription = "存储路径")
                        }
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                ComposeEntryCard(
                    hasRoot = store.hasRoot(),
                    rootLabel = store.rootLabel(),
                    onCompose = onCompose,
                    onSettings = onSettings,
                )
            }

            if (toast.isNotBlank()) {
                item {
                    Text(
                        toast,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MomentsColorsExt.wechatGreen.copy(alpha = 0.12f))
                            .padding(12.dp),
                        color = MomentsColorsExt.wechatGreen,
                        fontSize = 13.sp,
                    )
                    LaunchedEffect(toast) {
                        kotlinx.coroutines.delay(2500)
                        onDismissToast()
                    }
                }
            }

            if (!store.hasRoot()) {
                item {
                    Text(
                        "请先在右上角选择 Syncthing 同步目录（可对应电脑的 source/_drafts 与 assets 父文件夹）。",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        color = MomentsColorsExt.textSecondary,
                        fontSize = 14.sp,
                    )
                }
            }

            items(moments, key = { "${it.isDraft}_${it.id}" }) { m ->
                val key = store.momentKey(m)
                val checked = key in selectedKeys
                MomentCard(
                    moment = m,
                    store = store,
                    selectionMode = selectionMode,
                    selected = checked,
                    onToggleSelect = { toggleKey(key) },
                    onLongEnterSelection = { enterSelection(key) },
                )
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    LaunchedEffect(Unit) { onRefresh() }
}

@Composable
private fun ComposeEntryCard(
    hasRoot: Boolean,
    rootLabel: String,
    onCompose: () -> Unit,
    onSettings: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 0.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = CardDefaults.shape,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MomentsColorsExt.wechatGreen.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Text("我", fontWeight = FontWeight.Bold, color = MomentsColorsExt.wechatGreen)
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp)
            ) {
                Text(
                    if (hasRoot) "说点什么…" else "先选择存储文件夹",
                    color = MomentsColorsExt.textSecondary,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = hasRoot) { onCompose() }
                        .padding(vertical = 8.dp),
                )
                Text(
                    "目录：$rootLabel",
                    fontSize = 11.sp,
                    color = MomentsColorsExt.textSecondary,
                    modifier = Modifier.clickable { onSettings() },
                )
            }
            IconButton(onClick = { if (hasRoot) onCompose() }, enabled = hasRoot) {
                Icon(Icons.Default.PhotoCamera, contentDescription = "发动态", tint = MomentsColorsExt.wechatGreen)
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MomentCard(
    moment: LocalMoment,
    store: LocalBlogStore,
    selectionMode: Boolean = false,
    selected: Boolean = false,
    onToggleSelect: () -> Unit = {},
    onLongEnterSelection: () -> Unit = {},
) {
    val time = remember(moment.createdAt) {
        SimpleDateFormat("MM月dd日 HH:mm", Locale.getDefault()).format(Date(moment.createdAt))
    }
    val imageUris = remember(moment) {
        moment.imageNames.mapNotNull { store.assetUri(it) }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (selectionMode) {
                    Modifier.clickable { onToggleSelect() }
                } else {
                    Modifier.combinedClickable(
                        onClick = {},
                        onLongClick = onLongEnterSelection,
                    )
                },
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (selectionMode && selected) {
                MomentsColorsExt.wechatGreen.copy(alpha = 0.08f)
            } else {
                Color.White
            },
        ),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (selectionMode) {
                    Checkbox(checked = selected, onCheckedChange = { onToggleSelect() })
                }
                Text("我", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))
                Text(
                    if (moment.isDraft) "草稿" else "已发表",
                    fontSize = 11.sp,
                    color = MomentsColorsExt.textSecondary,
                )
            }
            Text(time, fontSize = 12.sp, color = MomentsColorsExt.textSecondary, modifier = Modifier.padding(top = 4.dp))
            if (moment.body.isNotBlank()) {
                Text(moment.body, modifier = Modifier.padding(top = 10.dp), fontSize = 16.sp, lineHeight = 22.sp)
            }
            if (imageUris.isNotEmpty()) {
                MomentImageGrid(
                    uris = imageUris,
                    editable = false,
                    onRemove = {},
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ComposeScreen(
    store: LocalBlogStore,
    onBack: () -> Unit,
    onPublished: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf("") }
    val images = remember { mutableStateListOf<Uri>() }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf("") }

    val useHarmonyGallery = remember { GalleryPicker.isHarmonyOrHuawei() }

    val pickVisualMedia = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(LocalBlogStore.MAX_IMAGES),
    ) { uris ->
        if (uris.isNullOrEmpty()) return@rememberLauncherForActivityResult
        val room = LocalBlogStore.MAX_IMAGES - images.size
        images.addAll(uris.take(room))
    }

    val pickSystemGallery = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) return@rememberLauncherForActivityResult
        val uris = GalleryPicker.parseUris(result.data)
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        val room = LocalBlogStore.MAX_IMAGES - images.size
        images.addAll(uris.take(room))
    }

    fun openPhotoGallery() {
        val room = LocalBlogStore.MAX_IMAGES - images.size
        if (room <= 0) return
        if (useHarmonyGallery) {
            pickSystemGallery.launch(GalleryPicker.createPickIntent(context, room))
        } else {
            pickVisualMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
    }

    Scaffold(
        containerColor = Color.White,
        topBar = {
            TopAppBar(
                title = { Text("") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            if (!store.hasRoot()) {
                                err = "请先选择存储目录"
                                return@TextButton
                            }
                            scope.launch {
                                busy = true
                                err = ""
                                val result = withContext(Dispatchers.IO) {
                                    store.saveMoment(text, images.toList(), publish = true)
                                }
                                busy = false
                                result.fold(
                                    onSuccess = { onPublished("已发表到 posts 文件夹") },
                                    onFailure = { err = it.message ?: "发表失败" },
                                )
                            }
                        },
                        enabled = !busy,
                    ) {
                        Text("发表", color = MomentsColorsExt.wechatGreen, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            TextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false)
                    .height(160.dp),
                placeholder = { Text("这一刻的想法…", color = MomentsColorsExt.textSecondary) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                IconButton(
                    onClick = { openPhotoGallery() },
                    enabled = images.size < LocalBlogStore.MAX_IMAGES && !busy,
                ) {
                    Icon(Icons.Default.AddPhotoAlternate, contentDescription = "加图", tint = MomentsColorsExt.wechatGreen)
                }
                Text("${images.size}/${LocalBlogStore.MAX_IMAGES} 张", color = MomentsColorsExt.textSecondary, fontSize = 13.sp)
            }

            MomentImageGrid(
                uris = images,
                editable = true,
                onRemove = { images.removeAt(it) },
            )

            Spacer(Modifier.weight(1f))

            Button(
                onClick = {
                    if (!store.hasRoot()) {
                        err = "请先选择存储目录"
                        return@Button
                    }
                    scope.launch {
                        busy = true
                        err = ""
                        val result = withContext(Dispatchers.IO) {
                            store.saveMoment(text, images.toList(), publish = false)
                        }
                        busy = false
                        result.fold(
                            onSuccess = { onPublished("已保存到 drafts 草稿") },
                            onFailure = { err = it.message ?: "保存失败" },
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !busy,
                colors = ButtonDefaults.buttonColors(containerColor = MomentsColorsExt.wechatGreen),
            ) {
                Text(if (busy) "保存中…" else "存为草稿（推荐 Syncthing 到 source/_drafts）")
            }

            if (err.isNotBlank()) {
                Text(err, color = Color(0xFFE54D42), modifier = Modifier.padding(top = 8.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    prefs: Prefs,
    store: LocalBlogStore,
    onPickFolder: () -> Unit,
    onBack: () -> Unit,
) {
    var drafts by remember { mutableStateOf(prefs.draftsDirName) }
    var posts by remember { mutableStateOf(prefs.postsDirName) }
    var assets by remember { mutableStateOf(prefs.assetsDirName) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("存储路径") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                "选择 Syncthing 在手机上同步的文件夹（或它的子文件夹）。\n" +
                    "建议与电脑对应：草稿 → source/_drafts，图 → assets。",
                fontSize = 14.sp,
                color = MomentsColorsExt.textSecondary,
            )

            Button(onClick = onPickFolder, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.FolderOpen, contentDescription = null)
                Text("  选择文件夹", modifier = Modifier.padding(start = 8.dp))
            }

            Text("当前：${store.rootLabel()}", fontWeight = FontWeight.Medium)

            HorizontalDivider()

            Text("子目录名称（相对所选根目录）", fontWeight = FontWeight.SemiBold)
            OutlinedTextField(
                value = drafts,
                onValueChange = { drafts = it },
                label = { Text("草稿目录") },
                supportingText = { Text("默认 drafts，可改为与电脑 _drafts 同名") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = posts,
                onValueChange = { posts = it },
                label = { Text("发表目录") },
                supportingText = { Text("默认 posts，可改为与电脑 _posts 对齐") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = assets,
                onValueChange = { assets = it },
                label = { Text("图片目录") },
                supportingText = { Text("默认 assets") },
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    prefs.draftsDirName = drafts
                    prefs.postsDirName = posts
                    prefs.assetsDirName = assets
                    onBack()
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MomentsColorsExt.wechatGreen),
            ) {
                Text("保存")
            }
        }
    }
}
