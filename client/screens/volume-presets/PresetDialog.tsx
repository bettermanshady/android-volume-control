import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useAppTheme } from '@/contexts/ThemeContext';

interface VolumePreset {
  id: string;
  name: string;
  volume: number;
}

interface PresetDialogProps {
  visible: boolean;
  editingPreset: VolumePreset | null;
  onClose: () => void;
  onSave: (name: string, volume: number) => void;
}

export default function PresetDialog({
  visible,
  editingPreset,
  onClose,
  onSave,
}: PresetDialogProps) {
  const { colors } = useAppTheme();
  const PRIMARY = colors.primary;
  const isDark = colors.background !== '#FAFAFA';
  const styles = createStyles(colors, PRIMARY);

  const [name, setName] = useState(editingPreset?.name ?? '');
  const [volume, setVolume] = useState(editingPreset?.volume ?? 50);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, volume);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: colors.cardBg },
        ]}
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          disabled={Platform.OS === 'web'}
        >
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editingPreset ? '编辑预设' : '新建预设'}
            </Text>

            <TextInput
              label="预设名称"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={[styles.input, { backgroundColor: colors.inputBg }]}
              autoFocus
              theme={{
                colors: {
                  primary: PRIMARY,
                  outline: colors.track,
                  onSurfaceVariant: colors.textSecondary,
                  text: colors.textPrimary,
                  placeholder: colors.textMuted,
                  background: colors.inputBg,
                  surface: colors.inputBg,
                },
                dark: isDark,
              }}
            />

            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>音量</Text>
                <Text style={[styles.sliderValue, { color: PRIMARY }]}>{volume}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={volume}
                onValueChange={setVolume}
                minimumTrackTintColor={PRIMARY}
                maximumTrackTintColor={colors.track}
                thumbTintColor={PRIMARY}
              />
            </View>

            <View style={styles.footer}>
              <Button
                onPress={onClose}
                style={styles.cancelBtn}
                labelStyle={{ color: colors.textSecondary, fontSize: 14 }}
              >
                取消
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={[styles.saveBtn, { backgroundColor: PRIMARY }]}
                labelStyle={{ fontSize: 14, fontWeight: '600', color: colors.primaryText }}
              >
                保存
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Portal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors'], PRIMARY: string) =>
  StyleSheet.create({
    modal: {
      margin: 24,
      borderRadius: 28,
      padding: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      marginBottom: 20,
    },
    input: {
      marginBottom: 16,
      fontSize: 16,
    },
    sliderSection: {
      marginBottom: 20,
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    sliderLabel: {
      fontSize: 14,
    },
    sliderValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    slider: {
      width: '100%',
      height: 40,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    cancelBtn: {
      marginRight: 8,
    },
    saveBtn: {
      borderRadius: 20,
    },
  });