import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../constants/theme';

export type BadgeStatus = 'present' | 'absent' | 'active' | 'ended' | 'warning';

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'present':
        return {
          bg: colors.successSoft,
          color: colors.success,
          icon: 'checkmark-circle' as const,
          defaultLabel: 'Present',
        };
      case 'absent':
        return {
          bg: colors.errorSoft,
          color: colors.error,
          icon: 'close-circle' as const,
          defaultLabel: 'Absent',
        };
      case 'active':
        return {
          bg: colors.warningSoft,
          color: colors.warning,
          icon: 'radio-button-on' as const,
          defaultLabel: 'Active',
        };
      case 'ended':
        return {
          bg: colors.border,
          color: colors.textSecondary,
          icon: 'checkmark-done-outline' as const,
          defaultLabel: 'Ended',
        };
      case 'warning':
      default:
        return {
          bg: colors.warningSoft,
          color: colors.warning,
          icon: 'warning-outline' as const,
          defaultLabel: 'Warning',
        };
    }
  };

  const config = getBadgeConfig();
  const displayLabel = label || config.defaultLabel;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Ionicons
        name={config.icon}
        size={14}
        color={config.color}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: config.color }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
});
