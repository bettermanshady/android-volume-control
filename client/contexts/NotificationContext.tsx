import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { NativeModules, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  isSupported,
  isToggleOn,
  setToggleOn,
  hasPermission,
  requestPermission,
  showVolumeNotification,
  hideVolumeNotification,
} from '@/utils/volumeNotification';
import { VolumeManager } from 'react-native-volume-manager';

interface NotificationContextValue {
  enabled: boolean;
  /** 是否支持（Android 且有原生模块） */
  supported: boolean;
  /**
   * 开关通知栏音量控件。
   * 开启时先引导授权，返回最终是否成功开启。
   */
  toggle: (on: boolean) => Promise<boolean>;
  /** 音量变化时同步通知内容（需已开启） */
  syncVolume: (volume: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// @ts-ignore
const nativeModule = Platform.OS === 'android' ? (NativeModules as any).VolumeNotification : undefined;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const supported = isSupported();

  // 启动时恢复开关状态；若已开启则请求授权并展示通知
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) return;
      const saved = await isToggleOn();
      if (cancelled) return;
      setEnabled(saved);
      if (saved) {
        const granted = await hasPermission();
        if (granted) {
          try {
            const res = await VolumeManager.getVolume();
            await showVolumeNotification(Math.round(res.volume * 100));
          } catch {
            await showVolumeNotification(50);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const toggle = useCallback(
    async (on: boolean): Promise<boolean> => {
      if (!supported) {
        Toast.show({ type: 'info', text1: '该功能仅支持 Android 设备' });
        return false;
      }
      if (!on) {
        await hideVolumeNotification();
        setEnabled(false);
        await setToggleOn(false);
        return true;
      }
      // 开启：先检查/申请通知权限（Android 13+ 首次引导授权）
      let granted = await hasPermission();
      if (!granted) {
        granted = await requestPermission();
      }
      if (!granted) {
        Toast.show({
          type: 'error',
          text1: '通知权限被拒绝',
          text2: '请在系统设置中允许通知后重试',
        });
        return false;
      }
      let volume = 50;
      try {
        const res = await VolumeManager.getVolume();
        volume = Math.round(res.volume * 100);
      } catch {
        // use default
      }
      const ok = await showVolumeNotification(volume);
      if (!ok) {
        Toast.show({ type: 'info', text1: '系统限制，通知栏控件暂不可用' });
        return false;
      }
      setEnabled(true);
      await setToggleOn(true);
      return true;
    },
    [supported]
  );

  const syncVolume = useCallback(
    (volume: number) => {
      if (!supported || !enabled || !nativeModule) return;
      try {
        nativeModule.updateVolume(Math.round(volume));
      } catch {
        // ignore
      }
    },
    [supported, enabled]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({ enabled, supported, toggle, syncVolume }),
    [enabled, supported, toggle, syncVolume]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}