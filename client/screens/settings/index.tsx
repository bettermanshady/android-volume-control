import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Switch } from 'react-native-paper';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAppTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface ThemeOption {
  key: ThemeMode;
  label: string;
  icon: 'sun' | 'moon' | 'circle-half-stroke';
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: 'system', label: '跟随系统', icon: 'circle-half-stroke' },
  { key: 'light', label: '浅色', icon: 'sun' },
  { key: 'dark', label: '深色', icon: 'moon' },
];

export default function SettingsScreen() {
  const { colors, mode, isDark, setMode } = useAppTheme();
  const { enabled, supported, toggle } = useNotification();
  const router = useSafeRouter();

  const handleNotifyToggle = async (value: boolean) => {
    await toggle(value);
  };

  return (
    <Screen safeAreaEdges={['left', 'right']} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 顶部 Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.iconBg }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.headerIconContainer, { backgroundColor: colors.primarySoft }]}>
            <FontAwesome6 name="gear" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>设置</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              主题与通知栏控件
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 主题设置 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>外观</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.optionRow}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <FontAwesome6 name="palette" size={16} color={colors.primary} />
            </View>
            <View style={styles.optionBody}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>主题模式</Text>
              <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
                选择您偏好的明暗外观
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {THEME_OPTIONS.map((opt, index) => {
            const active = mode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.themeItem,
                  index < THEME_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => setMode(opt.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.themeItemLeft, { backgroundColor: active ? colors.primarySoft : colors.iconBg }]}>
                  <FontAwesome6 name={opt.icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.themeItemLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                {active && <FontAwesome6 name="circle-check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 通知栏音量控件 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          通知栏控件
        </Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.optionRow}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <FontAwesome6 name="bell" size={16} color={colors.primary} />
            </View>
            <View style={styles.optionBody}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>音量栏控件</Text>
              <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
                {supported
                  ? '在通知栏常驻音量控件，点击 -/+ 快捷调节'
                  : '该功能目前仅支持 Android 设备'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleNotifyToggle}
              color={colors.primary}
              disabled={!supported}
            />
          </View>
        </View>

        {/* 隐私政策入口 */}
        <TouchableOpacity
          style={[styles.card, styles.linkRow, { backgroundColor: colors.cardBg }]}
          onPress={() => router.push('/privacy')}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
            <FontAwesome6 name="shield-halved" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>隐私政策</Text>
          <FontAwesome6 name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>智控音量 v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionBody: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionHint: {
    fontSize: 13,
    marginTop: 3,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: 'transparent',
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  themeItemLeft: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  themeItemLabel: {
    flex: 1,
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
});