import { NativeModules, Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

// @ts-ignore - 原生模块在 Android 平台由 VolumeControlModule 提供
const native = (NativeModules as any).VolumeControl;

export interface VolumeSnapshot {
  /** 最大档位（getStreamMaxVolume） */
  max: number;
  /** 当前档位（getStreamVolume） */
  index: number;
  /** 显示百分比 = round(index / max * 100)，永远等于实际档位换算值 */
  percent: number;
  /** 滑块步长 = 100 / max */
  step: number;
  /** 每档约占百分之（保留 1 位），用于说明文案 */
  percentPerStep: number;
}

/** Android 且已注册 VolumeControl 原生模块时才走系统档位读写；否则退回 react-native-volume-manager（如 Web 开发） */
export function isVolumeControlSupported(): boolean {
  return Platform.OS === 'android' && !!native;
}

const DEFAULT_MAX = 15;

class VolumeEngine {
  private snapshot: VolumeSnapshot = this.build(DEFAULT_MAX, 0);
  private subscribers = new Set<() => void>();
  private volumeEventListener: { remove: () => void } | null = null;

  private build(max: number, index: number): VolumeSnapshot {
    const m = Math.max(1, Math.round(max) || DEFAULT_MAX);
    const idx = Math.max(0, Math.min(m, Math.round(index || 0)));
    const step = 100 / m;
    return {
      max: m,
      index: idx,
      percent: Math.round((idx / m) * 100),
      step: Math.round(step * 10000) / 10000,
      percentPerStep: Math.round(step * 10) / 10,
    };
  }

  /** 百分比 → 最近档位（四舍五入，杜绝截断导致的少一档问题） */
  percentToIndex(percent: number): number {
    const m = this.snapshot.max;
    return Math.round((percent / 100) * m);
  }

  getSnapshot(): VolumeSnapshot {
    return this.snapshot;
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private emit() {
    this.subscribers.forEach((cb) => cb());
  }

  /** 回读实际档位并换算成百分比，更新状态并通知订阅者（保证显示=实际档位） */
  private async applyReadback() {
    if (!isVolumeControlSupported()) {
      try {
        const r = await VolumeManager.getVolume();
        this.snapshot = this.build(this.snapshot.max, Math.round(r.volume * this.snapshot.max));
        this.emit();
      } catch {
        // ignore
      }
      return;
    }
    try {
      const max = await native.getMaxVolume();
      const index = await native.getVolumeIndex();
      this.snapshot = this.build(max, index);
      this.emit();
    } catch {
      // ignore
    }
  }

  /** 冷启动 / 页面重新聚焦时同步一次 */
  async sync(): Promise<VolumeSnapshot> {
    await this.applyReadback();
    return this.snapshot;
  }

  /** 按百分比设置（预设应用入口）：换算成最近档位 → 写入 → 回读 */
  async setPercent(percent: number): Promise<void> {
    const index = Math.max(0, Math.min(this.snapshot.max, this.percentToIndex(percent)));
    await this.setIndex(index);
  }

  /** 直接写档位（clamp 0..max）并回读 */
  async setIndex(index: number): Promise<void> {
    const max = this.snapshot.max;
    const target = Math.max(0, Math.min(max, Math.round(index || 0)));
    if (!isVolumeControlSupported()) {
      try {
        await VolumeManager.setVolume(target / max);
      } catch {
        // ignore
      }
      await this.applyReadback();
      return;
    }
    try {
      await native.setVolumeIndex(target);
    } catch {
      // ignore
    }
    await this.applyReadback();
  }

  /** 升降若干档（加减按钮 / 系统步进），写入后回读 */
  async adjustBy(delta: number): Promise<void> {
    if (!isVolumeControlSupported()) {
      await this.setIndex(this.percentToIndex(this.snapshot.percent) + Math.round(delta));
      return;
    }
    try {
      await native.adjustVolumeIndex(Math.round(delta));
    } catch {
      // ignore
    }
    await this.applyReadback();
  }

  /** 监听系统音量变化：仅响应媒体流（music），变化后回读实际档位刷新 */
  startListening() {
    if (this.volumeEventListener) return;
    try {
      this.volumeEventListener = VolumeManager.addVolumeListener((data: any) => {
        // 只更新媒体音量，忽略铃声 / 闹钟 / 通知等流的音量变化带回滑块
        if (data && data.type != null && data.type !== 'music') return;
        this.applyReadback();
      });
    } catch {
      // listener not available
    }
  }

  stopListening() {
    if (this.volumeEventListener) {
      try {
        this.volumeEventListener.remove();
      } catch {
        // ignore
      }
      this.volumeEventListener = null;
    }
  }
}

export const volumeEngine = new VolumeEngine();