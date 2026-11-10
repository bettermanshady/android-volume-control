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
    const val ACTION_SET = "com.anonymous.x7659029384422228011.VOL_SET"
    const val EXTRA_PERCENT = "percent"

    /** 步长与 App 内保持一致：1% */
    const val STEP = 1

    /** 假滑块分段数：20 段，每段 5%。
     *  Android 通知栏 RemoteViews 不支持可拖动 SeekBar，
     *  用可点击小格代替，点击第 i 格 = 音量设为 (i+1)*5%。 */
    const val SEGMENT_COUNT = 20

    private val SEGMENT_IDS = intArrayOf(
        R.id.seg_0, R.id.seg_1, R.id.seg_2, R.id.seg_3, R.id.seg_4,
        R.id.seg_5, R.id.seg_6, R.id.seg_7, R.id.seg_8, R.id.seg_9,
        R.id.seg_10, R.id.seg_11, R.id.seg_12, R.id.seg_13, R.id.seg_14,
        R.id.seg_15, R.id.seg_16, R.id.seg_17, R.id.seg_18, R.id.seg_19
    )

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

    fun build(context: Context, volume: Int): Notification {
        val v = volume.coerceIn(0, 100)

        // 配色全部走资源引用（values-night / drawable-night 深浅色自动切换），
        // 不再运行时取色，避免切换深色模式后通知颜色「过期」
        val views = RemoteViews(context.packageName, R.layout.volume_notification)
        views.setTextViewText(R.id.notification_volume, "$v%")

        // 假滑块：前 filledCount 格显示填充色，其余显示空色
        val filledCount = Math.round(v * SEGMENT_COUNT / 100f)
        for (i in 0 until SEGMENT_COUNT) {
            val segId = SEGMENT_IDS[i]
            views.setImageViewResource(segId, if (i < filledCount) R.drawable.seg_filled else R.drawable.seg_empty)
            // 点击第 i 格 → 音量设为 (i+1)*5%；requestCode 必须每格不同，否则 PendingIntent 会被去重
            val setPI = PendingIntent.getBroadcast(
                context,
                100 + i,
                Intent(context, VolumeNotificationReceiver::class.java)
                    .setAction(ACTION_SET)
                    .putExtra(EXTRA_PERCENT, (i + 1) * 100 / SEGMENT_COUNT),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(segId, setPI)
        }

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