import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, AppColors } from '@/utils/appTheme';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'app_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyMode(mode: ThemeMode) {
  // system → 跟随系统；否则强制固定主题
  Appearance.setColorScheme(mode === 'system' ? null : mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');

  // 启动时加载已保存的主题偏好并立即应用
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setModeState(saved);
          applyMode(saved);
        }
      } catch {
        // ignore storage error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  // useColorScheme 会返回被 Appearance.setColorScheme 强制后的值
  const systemScheme = useColorScheme();
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const colors = useMemo(() => getColors(isDark), [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

// 便捷 hook：返回 { colors, mode, isDark, setMode }，广泛用于组件主题化
export function useAppTheme() {
  const { colors, mode, isDark, setMode } = useTheme();
  return { colors, mode, isDark, setMode };
}