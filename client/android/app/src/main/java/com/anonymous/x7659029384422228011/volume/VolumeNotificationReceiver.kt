package com.anonymous.x7659029384422228011.volume

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 处理通知栏音量控件按钮点击（- / +）。
 * 通过 AndroidManifest 静态注册，即使 App 进程被回收也能响应。
 */
class VolumeNotificationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            VolumeNotificationCenter.ACTION_DECREASE -> {
                // 微调 -1%（与 App 内 ± 按钮保持一致）
                val old = VolumeNotificationCenter.currentVolume(context)
                val new = VolumeNotificationCenter.adjustPercent(context, -1)
                VolumeNotificationCenter.showHearingWarningIfNeeded(context, old, new)
                // 回读实际档位刷新显示
                VolumeNotificationCenter.show(context, null)
            }
            VolumeNotificationCenter.ACTION_INCREASE -> {
                // 微调 +1%（与 App 内 ± 按钮保持一致）
                val old = VolumeNotificationCenter.currentVolume(context)
                val new = VolumeNotificationCenter.adjustPercent(context, 1)
                VolumeNotificationCenter.showHearingWarningIfNeeded(context, old, new)
                // 回读实际档位刷新显示
                VolumeNotificationCenter.show(context, null)
            }
            VolumeNotificationCenter.ACTION_SET -> {
                // 滑块点击：直接跳到目标百分比（每格 5%）
                val percent = intent.getIntExtra(VolumeNotificationCenter.EXTRA_PERCENT, -1)
                if (percent in 0..100) {
                    val old = VolumeNotificationCenter.currentVolume(context)
                    VolumeNotificationCenter.setVolume(context, percent)
                    val new = VolumeNotificationCenter.currentVolume(context)
                    VolumeNotificationCenter.showHearingWarningIfNeeded(context, old, new)
                    VolumeNotificationCenter.show(context, new)
                }
            }
        }
    }
}