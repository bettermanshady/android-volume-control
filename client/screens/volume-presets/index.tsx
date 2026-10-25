import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Screen } from '@/components/Screen';
import { volumeEngine } from '@/utils/volumeEngine';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { AppColors } from '@/utils/appTheme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import PresetCard from './PresetCard';
import PresetDialog from './PresetDialog';
import AdBanner from '@/components/AdBanner';
import PrivacyConsentModal from '@/components/PrivacyConsentModal';
import { hasPrivacyConsent } from '@/utils/adService';

const STORAGE_KEY = 'volume_presets';

interface VolumePreset {
  id: string;
  name: string;
  volume: number;
}

export default function VolumePresetsScreen() {
  const [presets, setPresets] = useState<VolumePreset[]>([]);
  const [currentVolume, setCurrentVolume] = useState(50);
  const [maxSteps, setMaxSteps] = useState(15);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingPreset, setEditingPreset] = useState<VolumePreset | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const router = useSafeRouter();
  const { colors, isDark, setMode } = useAppTheme();
  const { syncVolume } = useNotification();
  const soundRef = useRef<Audio.Sound | null>(null);

  const PRIMARY = colors.primary;

  // 检查隐私政策同意状态
  useEffect(() => {
    const checkPrivacy = async () => {
      const accepted = await hasPrivacyConsent();
      setPrivacyAccepted(accepted);
    };
    checkPrivacy();
  }, []);

  // 音量变化时同步通知栏控件
  useEffect(() => {
    syncVolume(currentVolume);
  }, [currentVolume, syncVolume]);

  // Load presets from AsyncStorage
  const loadPresets = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      } else {
        const defaults: VolumePreset[] = [
          { id: '1', name: '安静', volume: 30 },
          { id: '2', name: '正常', volume: 50 },
          { id: '3', name: '响亮', volume: 80 },
        ];
        setPresets(defaults);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch {
      // Silently handle storage errors
    }
  }, []);

  // 初始化：音频模式 + 提示音；订阅音档引擎；同步一次真实档位；监听系统音量
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = volumeEngine.subscribe(() => {
      if (cancelled) return;
      const s = volumeEngine.getSnapshot();
      setMaxSteps(s.max);
      setCurrentVolume(s.percent);
    });

    const init = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/beep.wav')
        );
        if (cancelled) {
          await sound.unloadAsync();
        } else {
          soundRef.current = sound;
        }
      } catch {
        // Audio init failed (提示音非关键)
      }

      if (!cancelled) {
        await volumeEngine.sync();
        volumeEngine.startListening();
        await loadPresets();
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribe();
      volumeEngine.stopListening();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [loadPresets]);

  // 页面重新聚焦时回读真实档位
  useFocusEffect(
    useCallback(() => {
      volumeEngine.sync();
    }, [])
  );

  // 应用预设：百分比 → 档位 → 写入 → 回读（显示数字永远等于实际档位）
  const applyPreset = (percent: number) => {
    volumeEngine.setPercent(percent);
  };

  // 加减按钮：系统升/降 1 档
  const handleAdjust = (delta: number) => {
    volumeEngine.adjustBy(delta);
  };

  // Play test beep sound
  const playTestBeep = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch {
      // Playback failed
    }
  };

  // Save presets to AsyncStorage
  const savePresets = async (newPresets: VolumePreset[]) => {
    setPresets(newPresets);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    } catch {
      // Storage save failed
    }
  };

  // Delete preset with confirmation
  const handleDelete = (id: string) => {
    Alert.alert('删除预设', '确定要删除这个预设吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          savePresets(presets.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  // Open dialog for adding a new preset
  const handleAdd = () => {
    setEditingPreset(null);
    setDialogVisible(true);
  };

  // Open dialog for editing an existing preset
  const handleEdit = (preset: VolumePreset) => {
    setEditingPreset(preset);
    setDialogVisible(true);
  };

  // Reset dialog form state based on editing mode
  const getDialogKey = () => {
    return editingPreset ? `edit-${editingPreset.id}` : 'add';
  };

  // Save preset from dialog (add or update)
  const handleSavePreset = (name: string, volume: number) => {
    if (editingPreset) {
      savePresets(
        presets.map((p) =>
          p.id === editingPreset.id ? { ...p, name, volume } : p
        )
      );
    } else {
      const newPreset: VolumePreset = {
        id: Date.now().toString(),
        name,
        volume,
      };
      savePresets([...presets, newPreset]);
    }
    setDialogVisible(false);
  };

  // 滑块：按最近档位换算显示值，并写入档位（引擎写后回读，保证显示=实际档位）
  const handleSliderChange = (value: number) => {
    const s = volumeEngine.getSnapshot();
    const index = Math.max(0, Math.min(s.max, Math.round((value / 100) * s.max)));
    const snapped = Math.round((index / s.max) * 100);
    setCurrentVolume(snapped);
    volumeEngine.setIndex(index);
  };

  // 档位换算说明：本机档数 N 与每档约占百分比
  const sliderStep = 100 / Math.max(1, maxSteps);
  const fmtStep = sliderStep.toFixed(1);

  const styles = createStyles(colors, PRIMARY);

  return (
    <Screen safeAreaEdges={['left', 'right']} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <FontAwesome6 name="volume-high" size={22} color={PRIMARY} />
            </View>
            <View>
              <Text style={styles.headerTitle}>智控音量</Text>
              <Text style={styles.headerSubtitle}>
                管理和快速切换音量
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* 一键切换浅色/深色（跟随系统时快捷切到浅色） */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setMode(isDark ? 'light' : 'dark')}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name={isDark ? 'sun' : 'moon'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {/* 更多设置入口 */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="gear" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Volume Card */}
        <View style={styles.volumeCard}>
          <Text style={styles.volumeLabel}>当前音量</Text>
          <View style={styles.volumeDisplay}>
            <Text style={styles.volumeNumber}>{currentVolume}</Text>
            <Text style={styles.volumeUnit}>%</Text>
          </View>
          <View style={styles.sliderRow}>
            <FontAwesome6 name="volume-low" size={14} color={colors.textMuted} />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={sliderStep}
              value={currentVolume}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={PRIMARY}
              maximumTrackTintColor={colors.track}
              thumbTintColor={PRIMARY}
            />
            <FontAwesome6 name="volume-high" size={14} color={colors.textMuted} />
          </View>
          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => handleAdjust(-1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.adjustLabel}>
              步进 1 档（约 {fmtStep}%）
            </Text>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => handleAdjust(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sliderHint}>
            本机媒体音量共 {maxSteps} 档，每档约 {fmtStep}%，无法精确到 1%
          </Text>
        </View>

        {/* Presets Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            预设列表
            {presets.length > 0 && (
              <Text style={styles.sectionCount}> ({presets.length})</Text>
            )}
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <FontAwesome6 name="plus" size={12} color={PRIMARY} />
            <Text style={styles.addBtnText}>添加</Text>
          </TouchableOpacity>
        </View>

        {/* Preset Cards */}
        <View style={styles.presetList}>
          {presets.map((preset, index) => (
            <View
              key={preset.id}
              style={{ marginBottom: index < presets.length - 1 ? 12 : 0 }}
            >
              <PresetCard
                name={preset.name}
                volume={preset.volume}
                onApply={() => applyPreset(preset.volume)}
                onPlayTest={playTestBeep}
                onEdit={() => handleEdit(preset)}
                onDelete={() => handleDelete(preset.id)}
              />
            </View>
          ))}
        </View>

        {presets.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome6 name="sliders" size={28} color={colors.track} />
            </View>
            <Text style={styles.emptyText}>暂无预设</Text>
            <Text style={styles.emptyHint}>
              点击「添加」创建第一个音量预设
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 隐私政策入口 */}
      <View style={styles.footerLinks}>
        <TouchableOpacity
          onPress={() => router.push('/privacy')}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLink}>隐私政策</Text>
        </TouchableOpacity>
      </View>

      {/* 广告 Banner - 芒果联盟聚合广告（仅隐私同意后展示） */}
      {privacyAccepted && (
        <AdBanner
          adUnitId="__测试广告ID__"
          height={60}
          onAdLoad={() => console.log('广告加载成功')}
          onAdError={(error) => console.log('广告加载失败:', error)}
        />
      )}

      {/* 隐私合规确认弹窗 */}
      <PrivacyConsentModal
        onAccepted={() => setPrivacyAccepted(true)}
      />

      <PresetDialog
        key={getDialogKey()}
        visible={dialogVisible}
        editingPreset={editingPreset}
        onClose={() => setDialogVisible(false)}
        onSave={handleSavePreset}
      />
    </Screen>
  );
}

const createStyles = (colors: AppColors, PRIMARY: string) =>
  StyleSheet.create({
    header: {
      paddingTop: Platform.OS === 'web' ? 20 : 56,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.background,
    },
    volumeCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      padding: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
      marginBottom: 28,
      alignItems: 'center',
    },
    volumeLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.5,
    },
    volumeDisplay: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginVertical: 8,
    },
    volumeNumber: {
      fontSize: 56,
      fontWeight: '700',
      color: PRIMARY,
      fontVariant: ['tabular-nums'],
    },
    volumeUnit: {
      fontSize: 22,
      fontWeight: '500',
      color: colors.textSecondary,
      marginLeft: 2,
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginTop: 8,
      gap: 8,
    },
    slider: {
      flex: 1,
      height: 40,
    },
    sliderHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
    adjustRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      marginTop: 12,
    },
    adjustBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: PRIMARY,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    adjustBtnText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primaryText,
      lineHeight: 32,
    },
    adjustLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      minWidth: 60,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionCount: {
      color: colors.textMuted,
      fontWeight: '400',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    addBtnText: {
      color: PRIMARY,
      fontSize: 14,
      fontWeight: '600',
    },
    presetList: {
      gap: 0,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.emptyIconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    emptyHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    footerLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    footerLink: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });