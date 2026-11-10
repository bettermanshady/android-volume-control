package com.anonymous.x7659029384422228011.volume

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * 开机自启：重启手机后恢复常驻音量控制前台服务与通知。
 * 注意：HyperOS 需要在系统设置中允许本应用「自启动」才会收到 BOOT_COMPLETED。
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            try {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, VolumeForegroundService::class.java)
                )
            } catch (_: Exception) {
                // Android 12+ 后台启动前台服务受限等异常，忽略
            }
        }
    }
}
