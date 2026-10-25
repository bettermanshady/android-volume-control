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
}