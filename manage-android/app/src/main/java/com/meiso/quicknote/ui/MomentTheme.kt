package com.meiso.quicknote.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val WeChatGreen = Color(0xFF07C160)
private val PageBg = Color(0xFFEDEDED)
private val CardBg = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF191919)
private val TextSecondary = Color(0xFF888888)

private val MomentsColors = lightColorScheme(
    primary = WeChatGreen,
    onPrimary = Color.White,
    background = PageBg,
    surface = CardBg,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    outline = Color(0xFFE5E5E5),
)

object MomentsColorsExt {
    val pageBackground = PageBg
    val textSecondary = TextSecondary
    val wechatGreen = WeChatGreen
}

@Composable
fun MomentsTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = MomentsColors, content = content)
}
