import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../constants/theme';
import { PrimaryButton } from './PrimaryButton';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  isOffline = false,
}) => {
  const icon = isOffline ? 'cloud-offline-outline' : 'warning-outline';
  const title = isOffline ? "Can't reach server" : 'Something went wrong';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <PrimaryButton
          title="Try again"
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  retryButton: {
    minWidth: 160,
  },
});
