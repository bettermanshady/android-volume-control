import { NativeModules, Platform, AppState, DeviceEventEmitter } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

// @ts-ignore - 原生模块在 Android 平台由 VolumeControlModule 提供
const native = (NativeModules as any).VolumeControl;

export interface VolumeSnapshot {
  /** 最大档位（getStreamMaxVolume，系统内部档位总数，可能远大于 UI 档数） */
  max: number;
  /** 当前档位（getStreamVolume，内部档位） */
  index: number;
  /** 显示百分比 = round(index / max * 100)，永远等于实际档位换算值 */
  percent: number;
  /** 滑块步长 = 100 / max（内部档位视角，保留兼容） */
  step: number;
  /** 一次系统步进实际跨越的内部档数（实测，如小米为 10） */
  stepSpan: number;
  /** UI 档数 = round(max / stepSpan)，即用户点击一次 ± 所跨的「一档」 */
  uiSteps: number;
  /** 每个 UI 档约占百分之（= stepSpan / max * 100，保留 1 位），用于说明文案 */
  percentPerStep: number;
}

/** Android 且已注册 VolumeControl 原生模块时才走系统档位读写；否则退回 react-native-volume-manager（如 Web 开发） */
export function isVolumeControlSupported(): boolean {
  return Platform.OS === 'android' && !!native;
}

const DEFAULT_MAX = 15;

class VolumeEngine {
  private snapshot: VolumeSnapshot = this.build(DEFAULT_MAX, 0, 1);
  private subscribers = new Set<() => void>();
  private volumeEventListener: { remove: () => void } | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private appResumeSubscription: { remove: () => void } | null = null;
  private nativeVolumeSubscription: { remove: () => void } | null = null;
  private listening = false;
  /** 刷新去抖定时器：连按音量键 / 多个事件源时合并为一次回读 */
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** 回前台后的有界补读（最多 3 次、1.2 秒内结束，不是常驻轮询） */
  private resumeTimers: ReturnType<typeof setTimeout>[] = [];
  /** 实测步进跨度缓存（0 表示尚未测得） */
  private measuredStepSpan = 0;

  private build(max: number, index: number, stepSpan: number): VolumeSnapshot {
    const m = Math.max(1, Math.round(max) || DEFAULT_MAX);
    const idx = Math.max(0, Math.min(m, Math.round(index || 0)));
    const sp = Math.max(1, Math.round(stepSpan) || 1);
    const step = 100 / m;
    const uiSteps = Math.max(1, Math.round(m / sp));
    return {
      max: m,
      index: idx,
      percent: Math.round((idx / m) * 100),
      step: Math.round(step * 10000) / 10000,
      stepSpan: sp,
      uiSteps,
      // percentPerStep = (stepSpan / max) * 100，保留 1 位小数
      percentPerStep: Math.round((sp / m) * 1000) / 10,
    };
  }

  /** 取得一次系统步进实际跨越的内部档数（原生实测并缓存；非 Android 按 1 处理） */
  private async ensureStepSpan(): Promise<number> {
    if (this.measuredStepSpan > 0) return this.measuredStepSpan;
    if (!isVolumeControlSupported()) {
      this.measuredStepSpan = 1;
      return 1;
    }
    try {
      const s = await native.getStepSpan();
      this.measuredStepSpan = Math.max(1, Math.round(s) || 1);
    } catch {
      this.measuredStepSpan = 1;
    }
    return this.measuredStepSpan;
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
        this.snapshot = this.build(
          this.snapshot.max,
          Math.round(r.volume * this.snapshot.max),
          this.snapshot.stepSpan || 1
        );
        this.emit();
      } catch {
        // ignore
      }
      return;
    }
    try {
      const max = await native.getMaxVolume();
      const index = await native.getVolumeIndex();
      const stepSpan = await this.ensureStepSpan();
      this.snapshot = this.build(max, index, stepSpan);
      this.emit();
    } catch {
      // ignore
    }
  }

  /**
   * 合并刷新请求：所有来源（原生事件 / 音量监听 / 回前台）共用一个 80ms 去抖，
   * 连续按音量键时只回读一次系统档位，不轮询、不常驻唤醒。
   */
  private scheduleReadback(delay = 80) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.applyReadback();
    }, delay);
  }

  /**
   * 回前台补读：立即读一次，并在 350ms / 1200ms 各补一次。
   * 息屏时 JS 被冻结，系统音量广播事件可能全部丢失，靠这个短窗口把真实档位拉回来；
   * 窗口结束后不再有任何定时器，空闲时零开销。
   */
  private resyncOnResume() {
    this.resumeTimers.forEach(clearTimeout);
    this.resumeTimers = [];
    this.scheduleReadback(0);
    [350, 1200].forEach((delay) => {
      const t = setTimeout(() => {
        this.resumeTimers = this.resumeTimers.filter((x) => x !== t);
        this.scheduleReadback(0);
      }, delay);
      this.resumeTimers.push(t);
    });
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

  /** 升降若干档（系统硬件步进，机身音量键视角） */
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

  /**
   * 微调：按百分比步进（App 内 ± 按钮使用，±1% 级精度）。
   * 以「当前显示百分比 ± 1」为目标换算最近档位写入，
   * 设备内部档位足够细（如 150 档）时每次点击可变化约 1%。
   */
  async adjustPercent(deltaPercent: number): Promise<void> {
    const target = Math.max(
      0,
      Math.min(100, Math.round(this.snapshot.percent) + Math.round(deltaPercent))
    );
    await this.setPercent(target);
  }

  /**
   * 监听系统音量变化（全事件驱动，零轮询）：
   * 1) 原生 VOLUME_CHANGED_ACTION 广播 → VolumeChanged 事件（App 前台时实时推送）
   * 2) react-native-volume-manager 监听（兼容 Web / 非原生模块场景）
   * 3) AppState 变为 active，或原生发来 AppResumed（Activity onResume /
   *    SCREEN_ON / USER_PRESENT）时做有界补读：息屏期间 JS 被完全冻结，
   *    音量广播事件会全部丢失，解锁后必须主动回读真实档位。
   */
  startListening() {
    if (this.listening) return;
    this.listening = true;
    try {
      this.volumeEventListener = VolumeManager.addVolumeListener((data: any) => {
        // 只更新媒体音量，忽略铃声 / 闹钟 / 通知等流的音量变化带回滑块
        if (data && data.type != null && data.type !== 'music') return;
        this.scheduleReadback();
      });
    } catch {
      // listener not available
    }

    if (Platform.OS === 'android') {
      try {
        this.nativeVolumeSubscription = DeviceEventEmitter.addListener(
          'VolumeChanged',
          () => this.scheduleReadback()
        );
      } catch {
        // 原生事件通道不可用，仍由音量监听 + 回前台补读兜底
      }
      try {
        // 比 AppState 更底层：Activity 恢复 / 屏幕点亮 / 解锁由系统直接触发，
        // 不依赖 RN 的 AppState 事件（息屏冻结时该事件可能不派发）
        this.appResumeSubscription = DeviceEventEmitter.addListener(
          'AppResumed',
          () => this.resyncOnResume()
        );
      } catch {
        // ignore
      }
    }

    try {
      this.appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') this.resyncOnResume();
      });
    } catch {
      // AppState 不可用（如 Web），忽略
    }
  }

  stopListening() {
    this.listening = false;
    if (this.volumeEventListener) {
      try {
        this.volumeEventListener.remove();
      } catch {
        // ignore
      }
      this.volumeEventListener = null;
    }
    if (this.nativeVolumeSubscription) {
      try {
        this.nativeVolumeSubscription.remove();
      } catch {
        // ignore
      }
      this.nativeVolumeSubscription = null;
    }
    if (this.appStateSubscription) {
      try {
        this.appStateSubscription.remove();
      } catch {
        // ignore
      }
      this.appStateSubscription = null;
    }
    if (this.appResumeSubscription) {
      try {
        this.appResumeSubscription.remove();
      } catch {
        // ignore
      }
      this.appResumeSubscription = null;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.resumeTimers.forEach(clearTimeout);
    this.resumeTimers = [];
  }
}

export const volumeEngine = new VolumeEngine();