import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography, radius, spacing } from '../constants/theme';

export interface LoadingIndicatorProps {
  variant?: 'screen' | 'inline' | 'skeleton';
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant = 'screen',
  message,
}) => {
  if (variant === 'skeleton') {
    return (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.skeletonCard}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineMedium} />
            <View style={styles.skeletonLineFull} />
          </View>
        ))}
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
        {message && <Text style={styles.inlineMessage}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ActivityIndicator color={colors.primary} size="large" />
      {message && <Text style={styles.screenMessage}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  screenMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  inlineMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  skeletonContainer: {
    padding: spacing.screenHorizontal,
  },
  skeletonCard: {
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
  },
  skeletonLineShort: {
    height: 14,
    width: '30%',
    backgroundColor: colors.border,
    borderRadius: radius.sm,
  },
  skeletonLineMedium: {
    height: 18,
    width: '70%',
    backgroundColor: colors.border,
    borderRadius: radius.sm,
  },
  skeletonLineFull: {
    height: 14,
    width: '90%',
    backgroundColor: colors.border,
    borderRadius: radius.sm,
  },
});
