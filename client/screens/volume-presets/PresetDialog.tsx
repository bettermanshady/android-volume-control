import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';
import Slider from '@react-native-community/slider';

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

const PRIMARY = '#1A73E8';

export default function PresetDialog({
  visible,
  editingPreset,
  onClose,
  onSave,
}: PresetDialogProps) {
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
        contentContainerStyle={styles.modal}
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          disabled={Platform.OS === 'web'}
        >
          <View>
            <Text style={styles.title}>
              {editingPreset ? 'Edit Preset' : 'New Preset'}
            </Text>

            <TextInput
              label="Preset Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              autoFocus
              theme={{
                colors: {
                  primary: PRIMARY,
                  outline: '#DADCE0',
                },
              }}
            />

            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Volume</Text>
                <Text style={styles.sliderValue}>{volume}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={volume}
                onValueChange={setVolume}
                minimumTrackTintColor={PRIMARY}
                maximumTrackTintColor="#DADCE0"
                thumbTintColor={PRIMARY}
              />
            </View>

            <View style={styles.footer}>
              <Button
                onPress={onClose}
                style={styles.cancelBtn}
                labelStyle={styles.cancelLabel}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.saveBtn}
                labelStyle={styles.saveLabel}
                buttonColor={PRIMARY}
              >
                Save
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    borderRadius: 28,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
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
    color: '#5F6368',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
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
  cancelLabel: {
    color: '#5F6368',
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 20,
  },
  saveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
