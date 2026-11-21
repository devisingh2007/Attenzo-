import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import { AppHeader, PrimaryButton } from '../../components';
import { classService, ClassDto } from '../../services/classService';
import { NormalizedApiError } from '../../services/api';

export default function JoinClassScreen() {
  const router = useRouter();
  const inputRef = useRef<any>(null);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinedClass, setJoinedClass] = useState<ClassDto | null>(null);

  const handleCodeChange = (text: string) => {
    // Clean to uppercase alphanumeric, max 6 characters
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    setCode(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await classService.joinClass(code);
      setJoinedClass(res.class);
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      if (apiError.code === 'INVALID_JOIN_CODE') {
        setErrorMessage('No class found for that code. Please verify the 6-character code with your teacher.');
      } else if (apiError.code === 'ALREADY_ENROLLED') {
        setErrorMessage('You are already enrolled in this class.');
      } else if (apiError.code === 'REMOVED_FROM_CLASS') {
        setErrorMessage('You were previously removed from this class and cannot rejoin.');
      } else {
        setErrorMessage(apiError.message || 'Failed to join class. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClass = () => {
    if (joinedClass) {
      router.replace(`/(student)/class/${joinedClass.id}` as any);
    } else {
      router.replace('/(student)/(tabs)/classes' as any);
    }
  };

  const codeChars = code.split('');

  return (
    <View style={styles.container}>
      <AppHeader
        title="Join Class"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {joinedClass ? (
            /* Success View */
            <View style={styles.successCard}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Successfully Joined!</Text>
              <Text style={styles.successSubtitle}>
                You are now enrolled in:
              </Text>
              <View style={styles.classInfoBadge}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={styles.classInfoText}>
                  {joinedClass.name} ({joinedClass.subjectCode})
                </Text>
              </View>

              <PrimaryButton
                title="Go to Class Details"
                icon="arrow-forward"
                onPress={handleGoToClass}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            /* Join Code Input Form */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Enter Class Join Code</Text>
              <Text style={styles.formSubtitle}>
                Ask your teacher for the 6-character code (e.g. K7MX4P) to enroll.
              </Text>

              {/* 6-box visual representation */}
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={styles.boxesRow}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = codeChars[index] || '';
                  const isCurrent = index === codeChars.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeBox,
                        isCurrent && styles.codeBoxActive,
                        char ? styles.codeBoxFilled : null,
                      ]}
                    >
                      <Text style={styles.codeBoxText}>{char}</Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* Hidden real input that captures text */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                style={styles.hiddenInput}
                accessibilityLabel="Enter 6-character join code"
              />

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <PrimaryButton
                title="Join"
                icon="checkmark"
                loading={loading}
                disabled={code.length !== 6 || loading}
                onPress={handleJoin}
                style={styles.submitButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.card,
  },
  formTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  codeBoxText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '800',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.raised,
  },
  successIconWrapper: {
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  classInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  classInfoText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  actionBtn: {
    width: '100%',
  },
});
