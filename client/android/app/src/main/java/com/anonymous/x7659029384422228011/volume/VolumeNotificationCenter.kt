package com.anonymous.x7659029384422228011.volume

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.widget.RemoteViews
import com.anonymous.x7659029384422228011.MainActivity
import com.anonymous.x7659029384422228011.R

/**
 * 通知栏音量控件的核心构建逻辑（被原生模块与 BroadcastReceiver 共用）。
 */
object VolumeNotificationCenter {

    const val CHANNEL_ID = "volume_control_channel"
    const val CHANNEL_NAME = "音量控制"
    const val NOTIFICATION_ID = 4101

    /** 高音量护耳提醒（独立通道，悬浮横幅级别） */
    const val WARNING_CHANNEL_ID = "hearing_warning_channel"
    const val WARNING_CHANNEL_NAME = "高音量提醒"
    const val WARNING_NOTIFICATION_ID = 4102

    /** 超过该百分比时触发护耳提醒 */
    const val HEARING_WARNING_THRESHOLD = 50

    const val ACTION_DECREASE = "com.anonymous.x7659029384422228011.VOL_DECREASE"
    const val ACTION_INCREASE = "com.anonymous.x7659029384422228011.VOL_INCREASE"

    /** 步长与 App 内保持一致：1% */
    const val STEP = 1

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            setShowBadge(false)
            setSound(null, null)
            enableVibration(false)
        }
        nm.createNotificationChannel(channel)
    }

    /** 读取当前媒体音量百分比 0-100 */
    fun currentVolume(context: Context): Int {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val idx = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        return if (max > 0) ((idx * 100) / max).coerceIn(0, 100) else 0
    }

    /** 设置媒体音量为指定百分比 0-100（换算为最近档位后写入并回读） */
    fun setVolume(context: Context, percent: Int) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val index = Math.round(percent.coerceIn(0, 100) * max / 100f).coerceIn(0, max)
        am.setStreamVolume(AudioManager.STREAM_MUSIC, index, 0)
    }

    /** 升降系统媒体音量 1 档（内部自带音量，走系统步进） */
    fun adjustVolumeIndex(context: Context, delta: Int) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val direction = if (delta > 0) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER
        am.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, 0)
    }

    /** 微调：按百分比步进（±1%，换算最近档位写入），返回调整后的百分比 */
    fun adjustPercent(context: Context, deltaPercent: Int): Int {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        if (max <= 0) return 0
        val idx = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        val currentPercent = idx * 100 / max
        val targetPercent = (currentPercent + deltaPercent).coerceIn(0, 100)
        val target = Math.round(targetPercent * max / 100f).coerceIn(0, max)
        am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
        return target * 100 / max
    }

    /** 音量越过 50% 时弹护耳提醒（由调用方在调整前后比较判断） */
    fun showHearingWarningIfNeeded(context: Context, oldPercent: Int, newPercent: Int) {
        if (oldPercent <= HEARING_WARNING_THRESHOLD && newPercent > HEARING_WARNING_THRESHOLD) {
            showHearingWarning(context, newPercent)
        }
    }

    private fun volumeIconRes(volume: Int): Int = R.drawable.ic_notification_speaker

    fun build(context: Context, volume: Int): Notification {
        val views = RemoteViews(context.packageName, R.layout.volume_notification)
        views.setTextViewText(R.id.notification_volume, "$volume%")
        views.setImageViewResource(R.id.notification_icon, volumeIconRes(volume))

        // 点击通知主体 → 打开 App
        val openPI = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 「-」按钮 → 减小音量
        val decPI = PendingIntent.getBroadcast(
            context,
            1,
            Intent(context, VolumeNotificationReceiver::class.java).setAction(ACTION_DECREASE),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 「+」按钮 → 增大音量
        val incPI = PendingIntent.getBroadcast(
            context,
            2,
            Intent(context, VolumeNotificationReceiver::class.java).setAction(ACTION_INCREASE),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        views.setOnClickPendingIntent(R.id.notification_decrease, decPI)
        views.setOnClickPendingIntent(R.id.notification_increase, incPI)

        val builder = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_speaker)
            .setOngoing(true)
            .setShowWhen(false)
            .setAutoCancel(false)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setContentIntent(openPI)
            .setCustomContentView(views)
            .setCustomBigContentView(views)
            .setStyle(Notification.DecoratedCustomViewStyle())

        return builder.build()
    }

    fun show(context: Context, volume: Int?) {
        createChannel(context)
        val v = volume ?: currentVolume(context)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try {
            nm.notify(NOTIFICATION_ID, build(context, v))
        } catch (e: SecurityException) {
            // 缺少 POST_NOTIFICATIONS 权限，静默降级
        }
    }

    fun hide(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(NOTIFICATION_ID)
    }

    fun createWarningChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(WARNING_CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            WARNING_CHANNEL_ID,
            WARNING_CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            setShowBadge(false)
            setSound(null, null)
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }

    /** 高音量护耳提醒：悬浮横幅，8 秒后自动消失，点击可打开 App */
    fun showHearingWarning(context: Context, percent: Int) {
        createWarningChannel(context)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val openPI = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = Notification.Builder(context, WARNING_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_speaker)
            .setContentTitle("高音量提醒")
            .setContentText("当前媒体音量 $percent%，已超过 50%。长时间高音量可能损伤听力，请注意保护耳朵。")
            .setAutoCancel(true)
            .setTimeoutAfter(8000)
            .setContentIntent(openPI)
            .build()
        try {
            nm.notify(WARNING_NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
            // 缺少 POST_NOTIFICATIONS 权限，静默降级
        }
    }
}