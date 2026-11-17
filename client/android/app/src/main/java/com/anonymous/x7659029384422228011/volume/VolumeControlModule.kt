package com.anonymous.x7659029384422228011.volume

import android.media.AudioManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 系统媒体音量档位控制原生模块（JS 侧统一音量引擎都走这里）。
 *
 * 所有方法均基于 AudioManager.STREAM_MUSIC（媒体音量）：
 * - getMaxVolume     : getStreamMaxVolume(STREAM_MUSIC)
 * - getVolumeIndex   : getStreamVolume(STREAM_MUSIC)
 * - setVolumeIndex   : setStreamVolume(STREAM_MUSIC, index, 0)（clamp 到 0..max）
 * - adjustVolumeIndex: adjustStreamVolume(STREAM_MUSIC, ADJUST_RAISE/LOWER, 0)（系统步进 1 档）
 *
 * 另外监听系统 VOLUME_CHANGED_ACTION 广播，向 JS 发送 VolumeChanged 事件；
 * 并在 Activity 回前台 / 屏幕点亮 / 用户解锁时发送 AppResumed 事件，
 * 让 JS 主动回读真实档位（息屏时 JS 被冻结，音量事件可能丢失）。
 * 纯事件驱动、无轮询：只有这些时刻才唤醒 JS。
 */
class VolumeControlModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    override fun getName(): String = "VolumeControl"

    private val mainHandler = Handler(Looper.getMainLooper())

    private val audioManager: AudioManager
        get() = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /** 一次 adjustStreamVolume(ADJUST_RAISE/LOWER) 实际跨越的内部档数（实测后缓存，0 表示尚未测量） */
    private var cachedStepSpan: Int = 0

    private var volumeChangeReceiver: BroadcastReceiver? = null

    init {
        reactContext.addLifecycleEventListener(this)
        registerVolumeChangeReceiver()
    }

    /** 息屏/后台期间 JS 冻结，音量广播事件可能丢失；回前台由 Activity 生命周期直接补一次 */
    override fun onHostResume() {
        signalAppResumed()
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun emit(eventName: String) {
        try {
            reactContext.emitDeviceEvent(eventName)
        } catch (_: Exception) {
            // JS 运行时未就绪，忽略
        }
    }

    /** 立即 + 400ms 各发一次：覆盖解锁后 JS 运行时恢复较慢的情况 */
    private fun signalAppResumed() {
        emit("AppResumed")
        mainHandler.postDelayed({ emit("AppResumed") }, 400)
    }

    /** 系统音量变化 → VolumeChanged；屏幕点亮/解锁 → AppResumed（动态注册，前台服务保活进程） */
    private fun registerVolumeChangeReceiver() {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    "android.media.VOLUME_CHANGED_ACTION" -> emit("VolumeChanged")
                    Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> signalAppResumed()
                }
            }
        }
        try {
            // Android 13+ 动态注册广播必须声明导出标志
            ContextCompat.registerReceiver(
                reactContext,
                receiver,
                IntentFilter().apply {
                    addAction("android.media.VOLUME_CHANGED_ACTION")
                    addAction(Intent.ACTION_SCREEN_ON)
                    addAction(Intent.ACTION_USER_PRESENT)
                },
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            volumeChangeReceiver = receiver
        } catch (_: Exception) {
            // 注册失败：仍有 react-native-volume-manager 监听 + Activity onResume 两层兜底
        }
    }

    @ReactMethod
    fun getMaxVolume(promise: Promise) {
        try {
            promise.resolve(audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        } catch (e: Exception) {
            promise.reject("E_AUDIO", e)
        }
    }

    @ReactMethod
    fun getVolumeIndex(promise: Promise) {
        try {
            promise.resolve(audioManager.getStreamVolume(AudioManager.STREAM_MUSIC))
        } catch (e: Exception) {
            promise.reject("E_AUDIO", e)
        }
    }

    @ReactMethod
    fun setVolumeIndex(index: Int) {
        val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val target = index.coerceIn(0, max)
        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
    }

    @ReactMethod
    fun adjustVolumeIndex(delta: Int) {
        val direction = if (delta > 0) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER
        audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, 0)
    }

    /**
     * 实测「一次系统步进」实际跨越的内部档数（如小米 STREAM_MUSIC max=150，但一次 ADJUST_RAISE 跨 10 档）。
     * 只在 cachedStepSpan == 0 时测量一次，测完立即恢复原档位；后续调用直接返回缓存值。
     */
    private fun measureStepSpan(am: AudioManager): Int {
        if (cachedStepSpan > 0) return cachedStepSpan
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        var span = 1
        try {
            if (cur < max) {
                am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, 0)
                span = (am.getStreamVolume(AudioManager.STREAM_MUSIC) - cur).coerceAtLeast(1)
            } else if (cur > 0) {
                am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, 0)
                span = (cur - am.getStreamVolume(AudioManager.STREAM_MUSIC)).coerceAtLeast(1)
            }
        } catch (e: Exception) {
            span = 1
        } finally {
            runCatching { am.setStreamVolume(AudioManager.STREAM_MUSIC, cur, 0) }
        }
        cachedStepSpan = span
        return span
    }

    /** 返回一次系统步进实际跨越的内部档数（首次调用会实测并缓存） */
    @ReactMethod
    fun getStepSpan(promise: Promise) {
        try {
            promise.resolve(measureStepSpan(audioManager))
        } catch (e: Exception) {
            promise.reject("E_AUDIO", e)
        }
    }

    override fun invalidate() {
        try {
            volumeChangeReceiver?.let { reactContext.unregisterReceiver(it) }
        } catch (_: Exception) {
            // ignore
        }
        volumeChangeReceiver = null
        try {
            reactContext.removeLifecycleEventListener(this)
        } catch (_: Exception) {
            // ignore
        }
        super.invalidate()
    }
}