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
                VolumeNotificationCenter.setVolume(
                    context,
                    VolumeNotificationCenter.currentVolume(context) - VolumeNotificationCenter.STEP
                )
                VolumeNotificationCenter.show(context, null)
            }
            VolumeNotificationCenter.ACTION_INCREASE -> {
                VolumeNotificationCenter.setVolume(
                    context,
                    VolumeNotificationCenter.currentVolume(context) + VolumeNotificationCenter.STEP
                )
                VolumeNotificationCenter.show(context, null)
            }
        }
    }
}