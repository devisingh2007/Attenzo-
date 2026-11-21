import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../constants/theme';

export interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel?: string;
  };
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onBack,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftContainer}>
          {onBack && (
            <Pressable
              onPress={onBack}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.rightContainer}>
          {rightAction && (
            <Pressable
              onPress={rightAction.onPress}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityLabel={rightAction.accessibilityLabel || 'Header action'}
              accessibilityRole="button"
            >
              <Ionicons
                name={rightAction.icon}
                size={22}
                color={colors.textPrimary}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...typography.h2,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});
