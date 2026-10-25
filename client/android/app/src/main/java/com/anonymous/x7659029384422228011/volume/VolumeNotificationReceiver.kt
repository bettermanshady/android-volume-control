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
                // 系统媒体音量降 1 档
                VolumeNotificationCenter.adjustVolumeIndex(context, -1)
                // 回读实际档位刷新显示
                VolumeNotificationCenter.show(context, null)
            }
            VolumeNotificationCenter.ACTION_INCREASE -> {
                // 系统媒体音量升 1 档
                VolumeNotificationCenter.adjustVolumeIndex(context, 1)
                // 回读实际档位刷新显示
                VolumeNotificationCenter.show(context, null)
            }
        }
    }
}