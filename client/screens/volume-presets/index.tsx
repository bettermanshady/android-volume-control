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
import { VolumeManager } from 'react-native-volume-manager';
import PresetCard from './PresetCard';
import PresetDialog from './PresetDialog';

const PRIMARY = '#1A73E8';
const STORAGE_KEY = 'volume_presets';

interface VolumePreset {
  id: string;
  name: string;
  volume: number;
}

export default function VolumePresetsScreen() {
  const [presets, setPresets] = useState<VolumePreset[]>([]);
  const [currentVolume, setCurrentVolume] = useState(50);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingPreset, setEditingPreset] = useState<VolumePreset | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const volumeListenerRef = useRef<{ remove: () => void } | null>(null);
  const isChangingFromSlider = useRef(false);
  const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load presets from AsyncStorage
  const loadPresets = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      } else {
        const defaults: VolumePreset[] = [
          { id: '1', name: 'Quiet', volume: 30 },
          { id: '2', name: 'Normal', volume: 50 },
          { id: '3', name: 'Loud', volume: 80 },
        ];
        setPresets(defaults);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch {
      // Silently handle storage errors
    }
  }, []);

  // Initialize audio, volume listener, and load presets
  useEffect(() => {
    let mounted = true;

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
        if (mounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch {
        // Audio init failed
      }

      try {
        const result = await VolumeManager.getVolume();
        if (mounted) {
          setCurrentVolume(Math.round(result.volume * 100));
        }
      } catch {
        // Volume manager not available (web)
      }

      if (mounted) {
        await loadPresets();
      }
    };

    init();

    // Listen for hardware volume button changes
    try {
      const listener = VolumeManager.addVolumeListener((data) => {
        if (!isChangingFromSlider.current) {
          setCurrentVolume(Math.round(data.volume * 100));
        }
      });
      volumeListenerRef.current = listener;
    } catch {
      // Volume listener not available
    }

    return () => {
      mounted = false;
      if (volumeListenerRef.current) {
        volumeListenerRef.current.remove();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (sliderTimerRef.current) {
        clearTimeout(sliderTimerRef.current);
      }
    };
  }, [loadPresets]);

  // Refresh volume when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshVolume = async () => {
        try {
          const result = await VolumeManager.getVolume();
          setCurrentVolume(Math.round(result.volume * 100));
        } catch {
          // Volume manager not available
        }
      };
      refreshVolume();
    }, [])
  );

  // Apply volume to system
  const applyVolume = async (volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    try {
      isChangingFromSlider.current = true;
      VolumeManager.setVolume(clamped / 100);
      setCurrentVolume(clamped);
      // Reset flag after a short delay to allow the change to propagate
      setTimeout(() => {
        isChangingFromSlider.current = false;
      }, 300);
    } catch {
      isChangingFromSlider.current = false;
    }
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
    Alert.alert('Delete Preset', 'Are you sure you want to delete this preset?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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

  // Handle slider change with debounced system volume update
  const handleSliderChange = (value: number) => {
    const rounded = Math.round(value);
    setCurrentVolume(rounded);
    isChangingFromSlider.current = true;

    if (sliderTimerRef.current) {
      clearTimeout(sliderTimerRef.current);
    }
    sliderTimerRef.current = setTimeout(() => {
      VolumeManager.setVolume(rounded / 100);
      isChangingFromSlider.current = false;
    }, 50);
  };

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <FontAwesome6 name="volume-high" size={22} color={PRIMARY} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Volume Presets</Text>
            <Text style={styles.headerSubtitle}>
              Manage and quickly switch volume levels
            </Text>
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
          <Text style={styles.volumeLabel}>Current Volume</Text>
          <View style={styles.volumeDisplay}>
            <Text style={styles.volumeNumber}>{currentVolume}</Text>
            <Text style={styles.volumeUnit}>%</Text>
          </View>
          <View style={styles.sliderRow}>
            <FontAwesome6 name="volume-low" size={14} color="#9AA0A6" />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={currentVolume}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={PRIMARY}
              maximumTrackTintColor="#DADCE0"
              thumbTintColor={PRIMARY}
            />
            <FontAwesome6 name="volume-high" size={14} color="#9AA0A6" />
          </View>
          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => applyVolume(currentVolume - 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.adjustLabel}>1% step</Text>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => applyVolume(currentVolume + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sliderHint}>Drag to fine-tune system volume</Text>
        </View>

        {/* Presets Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Presets
            {presets.length > 0 && (
              <Text style={styles.sectionCount}> ({presets.length})</Text>
            )}
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <FontAwesome6 name="plus" size={12} color={PRIMARY} />
            <Text style={styles.addBtnText}>Add</Text>
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
                onApply={() => applyVolume(preset.volume)}
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
              <FontAwesome6 name="sliders" size={28} color="#DADCE0" />
            </View>
            <Text style={styles.emptyText}>No presets yet</Text>
            <Text style={styles.emptyHint}>
              Tap Add to create your first volume preset
            </Text>
          </View>
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  volumeCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#5F6368',
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
    color: '#5F6368',
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
    color: '#9AA0A6',
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
    color: '#FFFFFF',
    lineHeight: 32,
  },
  adjustLabel: {
    fontSize: 13,
    color: '#5F6368',
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
    color: '#1F1F1F',
  },
  sectionCount: {
    color: '#9AA0A6',
    fontWeight: '400',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
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
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#5F6368',
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    color: '#9AA0A6',
    marginTop: 4,
  },
});
