package com.meiso.quicknote.ui

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.meiso.quicknote.LocalBlogStore

/** 固定每行 5 张缩略图；点击查看大图并可左右滑动 */
@Composable
fun MomentImageGrid(
    uris: List<Uri>,
    editable: Boolean,
    onRemove: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (uris.isEmpty()) return
    var previewIndex by remember { mutableIntStateOf(-1) }
    val columns = if (uris.size == 1) 1 else LocalBlogStore.PHOTO_GRID_COLS
    val rows = uris.chunked(columns)

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        rows.forEachIndexed { rowIdx, rowUris ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                rowUris.forEachIndexed { colIdx, uri ->
                    val index = rowIdx * columns + colIdx
                    val cellModifier = if (uris.size == 1) {
                        Modifier
                            .fillMaxWidth(0.66f)
                            .aspectRatio(1f)
                    } else {
                        Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                    }
                    Box(
                        modifier = cellModifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFFF7F7F7))
                            .clickable(enabled = !editable) { previewIndex = index }
                    ) {
                        AsyncImage(
                            model = uri,
                            contentDescription = null,
                            modifier = Modifier.matchParentSize(),
                            contentScale = if (uris.size == 1) ContentScale.Fit else ContentScale.Crop,
                        )
                        if (editable) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "移除",
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(4.dp)
                                    .clickable { onRemove(index) },
                                tint = Color.White,
                            )
                        }
                    }
                }
                if (columns > 1) {
                    repeat(columns - rowUris.size) {
                        Box(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }

    if (previewIndex >= 0) {
        ImageLightbox(
            uris = uris,
            startIndex = previewIndex,
            onDismiss = { previewIndex = -1 },
        )
    }
}
