package com.anonymous.x7659029384422228011.volume

import android.media.AudioManager
import android.content.Context
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
 */
class VolumeControlModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VolumeControl"

    private val audioManager: AudioManager
        get() = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /** 一次 adjustStreamVolume(ADJUST_RAISE/LOWER) 实际跨越的内部档数（实测后缓存，0 表示尚未测量） */
    private var cachedStepSpan: Int = 0

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
}