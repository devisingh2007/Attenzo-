import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../constants/theme';

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  variant = 'outline',
  disabled = false,
  icon,
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          container: styles.dangerContainer,
          text: styles.dangerText,
          iconColor: colors.error,
        };
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
          iconColor: colors.primary,
        };
      case 'outline':
      default:
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          iconColor: colors.primary,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.baseButton,
        vStyles.container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={disabled ? colors.textMuted : vStyles.iconColor}
          style={styles.icon}
        />
      )}
      <Text style={[styles.baseText, vStyles.text, disabled && styles.disabledText]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
    backgroundColor: 'transparent',
  },
  outlineContainer: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dangerContainer: {
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  ghostContainer: {
    borderWidth: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    borderColor: colors.disabledBg,
    backgroundColor: 'transparent',
  },
  baseText: {
    ...typography.button,
  },
  outlineText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.error,
  },
  ghostText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textMuted,
  },
  icon: {
    marginRight: spacing.sm,
  },
});
