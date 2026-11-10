package com.anonymous.x7659029384422228011.volume

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.IBinder
import androidx.core.content.ContextCompat

/**
 * 常驻音量控制前台服务。
 *
 * 之前用普通 notify() 展示常驻通知，App 进程被系统回收后通知就消失了。
 * 改为前台服务（specialUse 类型）持有该通知后：
 * - 通知由系统保证展示，App 进程被回收也不受影响
 * - 服务存活期间持续监听 VOLUME_CHANGED_ACTION，音量变化实时刷新通知
 * - 音量（含物理按键调节）跨越 50% 时触发护耳提醒
 */
class VolumeForegroundService : Service() {

    private var volumeReceiver: BroadcastReceiver? = null
    private var lastPercent = -1

    override fun onCreate() {
        super.onCreate()
        lastPercent = VolumeNotificationCenter.currentVolume(this)
        // 前台服务必须在创建后立即 startForeground，否则 ANR/崩溃
        startForeground(
            VolumeNotificationCenter.NOTIFICATION_ID,
            VolumeNotificationCenter.build(this, lastPercent)
        )
        registerVolumeChangeReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 服务被系统重建后走 onCreate 重新 startForeground；
        // 正常启动路径下这里刷新一次通知（幂等）
        VolumeNotificationCenter.show(this, null)
        return START_STICKY
    }

    override fun onDestroy() {
        try {
            volumeReceiver?.let { unregisterReceiver(it) }
        } catch (_: Exception) {
            // ignore
        }
        volumeReceiver = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun registerVolumeChangeReceiver() {
        if (volumeReceiver != null) return
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == "android.media.VOLUME_CHANGED_ACTION") {
                    val newPercent = VolumeNotificationCenter.currentVolume(this@VolumeForegroundService)
                    if (newPercent != lastPercent) {
                        val old = lastPercent
                        lastPercent = newPercent
                        VolumeNotificationCenter.show(this@VolumeForegroundService, newPercent)
                        // 物理按键/其他 App 调节跨过 50% 也提醒（防误触）
                        if (old in 0..100) {
                            VolumeNotificationCenter.showHearingWarningIfNeeded(
                                this@VolumeForegroundService, old, newPercent
                            )
                        }
                    }
                }
            }
        }
        try {
            ContextCompat.registerReceiver(
                this,
                receiver,
                IntentFilter("android.media.VOLUME_CHANGED_ACTION"),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            volumeReceiver = receiver
        } catch (_: Exception) {
            // 注册失败忽略
        }
    }
}
