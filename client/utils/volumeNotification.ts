import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// @ts-ignore - 原生模块在 Android 平台由 VolumeNotificationModule 提供
const native = (NativeModules as any).VolumeNotification;

const ENABLE_KEY = 'volume_notification_enabled';

export async function isToggleOn(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ENABLE_KEY);
    // 未设置过视为默认开启
    if (v === null) return true;
    return v === 'true';
  } catch {
    return true;
  }
}

export async function setToggleOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLE_KEY, on ? 'true' : 'false');
  } catch {
    // ignore
  }
}

/** 仅 Android 且已注册原生模块时可用 */
export function isSupported(): boolean {
  return Platform.OS === 'android' && !!native;
}

/** Android 13+ 需要 POST_NOTIFICATIONS 运行权限 */
export async function hasPermission(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await native.hasPermission();
  } catch {
    return false;
  }
}

/** 请求通知运行权限 */
export async function requestPermission(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await native.requestPermission();
  } catch {
    return false;
  }
}

/** 显示通知栏音量控件（需先授权） */
export async function showVolumeNotification(volume: number): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    native.showNotification(Math.round(volume));
    return true;
  } catch {
    return false;
  }
}

/** 隐藏通知栏音量控件 */
export async function hideVolumeNotification(): Promise<void> {
  if (!isSupported()) return;
  try {
    native.hideNotification();
  } catch {
    // ignore
  }
}

/** 音量变化时实时更新通知内容 */
export async function updateVolumeNotification(volume: number): Promise<void> {
  if (!isSupported()) return;
  try {
    native.updateVolume(Math.round(volume));
  } catch {
    // ignore
  }
}

export async function isNativeShowing(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await native.isShowing();
  } catch {
    return false;
  }
}