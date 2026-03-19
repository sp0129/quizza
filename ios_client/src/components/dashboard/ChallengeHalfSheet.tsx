import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface ChallengeHalfSheetProps {
  visible: boolean;
  onDuelFriend: () => void;
  onCreateChallenge: () => void;
  onClose: () => void;
}

export default function ChallengeHalfSheet({ visible, onDuelFriend, onCreateChallenge, onClose }: ChallengeHalfSheetProps) {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
        <Text style={styles.title}>⚔️ CHALLENGE</Text>

        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDuelFriend();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.optionIcon}>👤</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>Duel a Friend</Text>
            <Text style={styles.optionSub}>Pick a friend and go head-to-head</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCreateChallenge();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.optionIcon}>🏟️</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>Create Open Challenge</Text>
            <Text style={styles.optionSub}>Play solo, then dare the community</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  optionIcon: { fontSize: 28 },
  optionContent: { flex: 1 },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  optionSub: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
