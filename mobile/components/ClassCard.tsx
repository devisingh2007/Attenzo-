import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing, shadows } from '../constants/theme';

export interface ClassCardProps {
  name: string;
  subjectCode: string;
  subtitle?: string;
  studentCount?: number;
  percentage?: number | null;
  activeSession?: boolean;
  onPress: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  name,
  subjectCode,
  subtitle,
  studentCount,
  percentage,
  activeSession = false,
  onPress,
}) => {
  const getProgressColor = (pct: number) => {
    if (pct >= 75) return colors.success;
    if (pct >= 50) return colors.warning;
    return colors.error;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>{subjectCode}</Text>
        </View>
        {activeSession && (
          <View style={styles.activeSessionChip}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Session Active</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {name}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}

      <View style={styles.bottomRow}>
        {typeof studentCount === 'number' && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{studentCount} {studentCount === 1 ? 'student' : 'students'}</Text>
          </View>
        )}

        {percentage !== undefined && percentage !== null && (
          <View style={styles.percentageContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                    backgroundColor: getProgressColor(percentage),
                  },
                ]}
              />
            </View>
            <Text style={[styles.percentageText, { color: getProgressColor(percentage) }]}>
              {percentage.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  codePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  codeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  activeSessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
    marginRight: 4,
  },
  activeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
    fontSize: 11,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: spacing.md,
  },
  progressBarBg: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginRight: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
