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
        VolumeNotificationCenter.show(reactContext, volume.coerceIn(0, 100))
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
        VolumeNotificationCenter.hide(reactContext)
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
            reactContext.registerReceiver(receiver, IntentFilter("android.media.VOLUME_CHANGED_ACTION"))
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