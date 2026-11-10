package com.anonymous.x7659029384422228011.volume

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.anonymous.x7659029384422228011.MainActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 通知栏音量控件原生模块。
 *
 * - showNotification / updateVolume / hideNotification：展示、更新、隐藏常驻音量通知
 * - hasPermission / requestPermission：Android 13+ POST_NOTIFICATIONS 运行时授权
 * - 内部监听 VOLUME_CHANGED_ACTION，音量变化时实时刷新通知内容
 */
class VolumeNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var volumeReceiver: BroadcastReceiver? = null
    private var showing = false

    override fun getName(): String = "VolumeNotification"

    @ReactMethod
    fun showNotification(volume: Int) {
        if (Build.VERSION.SDK_INT >= 33 && !hasPermissionSync()) {
            return
        }
        // 先立即以传入音量展示一次（服务启动后会自行接管刷新）
        VolumeNotificationCenter.show(reactContext, volume.coerceIn(0, 100))
        // 通过前台服务持有通知，实现真正常驻（进程被回收后通知仍在）
        try {
            ContextCompat.startForegroundService(
                reactContext,
                Intent(reactContext, VolumeForegroundService::class.java)
            )
        } catch (_: Exception) {
            // 后台启动前台服务受限时，退回普通常驻通知
        }
        showing = true
        registerVolumeChangeReceiver()
    }

    @ReactMethod
    fun updateVolume(volume: Int) {
        if (showing) {
            VolumeNotificationCenter.show(reactContext, volume.coerceIn(0, 100))
        }
    }

    @ReactMethod
    fun hideNotification() {
        showing = false
        unregisterVolumeChangeReceiver()
        // 停止前台服务（服务停止时其通知会一并移除，再显式清除兑底）
        try {
            reactContext.stopService(Intent(reactContext, VolumeForegroundService::class.java))
        } catch (_: Exception) {
            // ignore
        }
        VolumeNotificationCenter.hide(reactContext)
    }

    @ReactMethod
    fun showHearingWarning(volume: Int) {
        if (Build.VERSION.SDK_INT >= 33 && !hasPermissionSync()) {
            return
        }
        VolumeNotificationCenter.showHearingWarning(reactContext, volume.coerceIn(0, 100))
    }

    @ReactMethod
    fun isShowing(promise: Promise) {
        promise.resolve(showing)
    }

    @ReactMethod
    fun hasPermission(promise: Promise) {
        promise.resolve(hasPermissionSync())
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < 33) {
            promise.resolve(true)
            return
        }
        if (hasPermissionSync()) {
            promise.resolve(true)
            return
        }
        val activity = reactContext.currentActivity as? MainActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.setPermissionResultCallback { granted -> promise.resolve(granted) }
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            MainActivity.VOLUME_PERMISSION_REQUEST_CODE
        )
    }

    private fun hasPermissionSync(): Boolean {
        if (Build.VERSION.SDK_INT < 33) return true
        return ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun registerVolumeChangeReceiver() {
        if (volumeReceiver != null) return
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == "android.media.VOLUME_CHANGED_ACTION") {
                    VolumeNotificationCenter.show(
                        reactContext,
                        VolumeNotificationCenter.currentVolume(reactContext)
                    )
                }
            }
        }
        try {
            // Android 13+（targetSdk 34 起）动态注册广播必须声明导出标志，
            // 否则可能抛 SecurityException 导致通知栏控件无法随音量刷新。
            ContextCompat.registerReceiver(
                reactContext,
                receiver,
                IntentFilter("android.media.VOLUME_CHANGED_ACTION"),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            volumeReceiver = receiver
        } catch (_: Exception) {
            // 注册失败忽略
        }
    }

    private fun unregisterVolumeChangeReceiver() {
        try {
            volumeReceiver?.let { reactContext.unregisterReceiver(it) }
        } catch (_: Exception) {
            // ignore
        }
        volumeReceiver = null
    }

    override fun invalidate() {
        super.invalidate()
        unregisterVolumeChangeReceiver()
    }
}