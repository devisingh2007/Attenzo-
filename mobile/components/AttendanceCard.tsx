import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, radius, spacing, shadows } from '../constants/theme';
import { StatusBadge } from './StatusBadge';

export interface AttendanceCardProps {
  title: string;
  date: string;
  status: 'present' | 'absent';
  method?: 'code' | 'manual' | null;
  onPress?: () => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  title,
  date,
  status,
  method,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      <View style={styles.right}>
        <StatusBadge status={status} />
        {method === 'manual' && (
          <Text style={styles.methodCaption}>Manual</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.bodyStrong,
    marginBottom: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  methodCaption: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
