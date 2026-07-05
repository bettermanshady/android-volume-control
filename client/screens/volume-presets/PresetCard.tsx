import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface PresetCardProps {
  name: string;
  volume: number;
  onApply: () => void;
  onPlayTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PRIMARY = '#1A73E8';

export default function PresetCard({
  name,
  volume,
  onApply,
  onPlayTest,
  onEdit,
  onDelete,
}: PresetCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <View style={styles.iconContainer}>
          <FontAwesome6 name="volume-high" size={18} color={PRIMARY} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.volume}>{volume}%</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPlayTest}
          activeOpacity={0.6}
        >
          <FontAwesome6 name="play" size={14} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onEdit}
          activeOpacity={0.6}
        >
          <FontAwesome6 name="pen" size={14} color="#5F6368" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onDelete}
          activeOpacity={0.6}
        >
          <FontAwesome6 name="trash" size={14} color="#D93025" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={onApply}
          activeOpacity={0.8}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  volume: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  applyButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 4,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
