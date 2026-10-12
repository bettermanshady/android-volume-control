import { useMemo } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';

export interface AppColors {
  primary: string;
  primarySoft: string;
  primaryText: string;
  background: string;
  headerBg: string;
  cardBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  iconBg: string;
  track: string;
  danger: string;
  adBg: string;
  adBorder: string;
  inputBg: string;
  buttonSecondaryBg: string;
  emptyIconBg: string;
}

const lightColors: AppColors = {
  primary: '#1A73E8',
  primarySoft: 'rgba(26, 115, 232, 0.08)',
  primaryText: '#FFFFFF',
  background: '#FAFAFA',
  headerBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  border: '#E8EAED',
  textPrimary: '#1F1F1F',
  textSecondary: '#5F6368',
  textMuted: '#9AA0A6',
  iconBg: 'rgba(0, 0, 0, 0.04)',
  track: '#DADCE0',
  danger: '#D93025',
  adBg: '#E8EAED',
  adBorder: '#DADCE0',
  inputBg: '#FFFFFF',
  buttonSecondaryBg: '#F1F3F4',
  emptyIconBg: '#F1F3F4',
};

const darkColors: AppColors = {
  primary: '#3B82F6',
  primarySoft: 'rgba(59, 130, 246, 0.16)',
  primaryText: '#FFFFFF',
  background: '#0B0B0F',
  headerBg: '#121218',
  cardBg: '#1B1B22',
  border: '#2A2A33',
  textPrimary: '#F5F5F7',
  textSecondary: '#A6A6B0',
  textMuted: '#71717A',
  iconBg: 'rgba(255, 255, 255, 0.07)',
  track: '#3A3A44',
  danger: '#F87171',
  adBg: '#23232B',
  adBorder: '#3A3A44',
  inputBg: '#1B1B22',
  buttonSecondaryBg: '#26262E',
  emptyIconBg: '#26262E',
};

export function getColors(isDark: boolean): AppColors {
  return isDark ? darkColors : lightColors;
}

/**
 * 返回 App 当前主题颜色对象。
 * 在已包裹 <ThemeProvider> 的组件中调用。
 */
export function useAppColors(): AppColors {
  const { isDark } = useAppTheme();
  return useMemo(() => getColors(isDark), [isDark]);
}