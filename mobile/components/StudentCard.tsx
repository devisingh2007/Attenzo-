import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing, shadows } from '../constants/theme';

export interface StudentCardProps {
  name: string;
  rollNumber: string;
  percentage?: number | null;
  onRemove?: () => void;
  onPress?: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  name,
  rollNumber,
  percentage,
  onRemove,
  onPress,
}) => {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isLowAttendance = percentage !== null && percentage !== undefined && percentage < 75;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.rollNumber}>{rollNumber}</Text>
      </View>

      {percentage !== undefined && percentage !== null && (
        <View
          style={[
            styles.percentageBadge,
            isLowAttendance ? styles.percentageWarning : styles.percentageNormal,
          ]}
        >
          <Text
            style={[
              styles.percentageText,
              { color: isLowAttendance ? colors.warning : colors.success },
            ]}
          >
            {percentage.toFixed(1)}%
          </Text>
        </View>
      )}

      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={8}
          accessibilityLabel="Remove student"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      )}
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
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.bodyStrong,
    marginBottom: 2,
  },
  rollNumber: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  percentageBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  percentageNormal: {
    backgroundColor: colors.successSoft,
  },
  percentageWarning: {
    backgroundColor: colors.warningSoft,
  },
  percentageText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  removeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
