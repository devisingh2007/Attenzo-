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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../constants/theme';
import { AppHeader, PrimaryButton, SecondaryButton, ErrorState } from '../../../../components';
import { INITIAL_STUDENT_CLASSES } from '../../../../constants/mockStudentData';

export type MarkOutcome =
  | 'success'
  | 'wrong_code'
  | 'expired'
  | 'already_marked'
  | 'not_enrolled'
  | 'rate_limited'
  | 'network_error';

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cls = INITIAL_STUDENT_CLASSES.find((c) => c.id === id) || INITIAL_STUDENT_CLASSES[0];

  const inputRef = useRef<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Dev simulation state
  const [simulatedOutcome, setSimulatedOutcome] = useState<MarkOutcome>('success');
  const [activeResult, setActiveResult] = useState<MarkOutcome | null>(null);

  const handleCodeChange = (text: string) => {
    // Only numbers, max 6 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    if (activeResult && activeResult !== 'success') {
      setActiveResult(null);
    }
  };

  const handleSubmit = () => {
    if (code.length !== 6) return;

    setLoading(true);
    setActiveResult(null);

    setTimeout(() => {
      setLoading(false);
      setActiveResult(simulatedOutcome);
    }, 700);
  };

  const handleReturnToClass = () => {
    router.replace(`/(student)/class/${cls.id}` as any);
  };

  const codeDigits = code.split('');

  return (
    <View style={styles.container}>
      <AppHeader
        title="Mark Attendance"
        onBack={() => router.back()}
      />

      {/* Dev Outcome Switcher Bar */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Simulate Result:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoPills}>
          {(
            [
              'success',
              'wrong_code',
              'expired',
              'already_marked',
              'not_enrolled',
              'rate_limited',
              'network_error',
            ] as const
          ).map((outcome) => (
            <Pressable
              key={outcome}
              onPress={() => {
                setSimulatedOutcome(outcome);
                setActiveResult(null);
              }}
              style={[
                styles.demoPill,
                simulatedOutcome === outcome && styles.demoPillActive,
              ]}
            >
              <Text
                style={[
                  styles.demoPillText,
                  simulatedOutcome === outcome && styles.demoPillTextActive,
                ]}
              >
                {outcome.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Class Header Information */}
          <View style={styles.classInfoCard}>
            <Text style={styles.classLabel}>CLASS</Text>
            <Text style={styles.className}>{cls.name}</Text>
            <Text style={styles.classSub}>{cls.subjectCode} · {cls.teacherName}</Text>
          </View>

          {/* 1. SUCCESS STATE */}
          {activeResult === 'success' && (
            <View style={styles.successCard}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>You're marked present!</Text>
              <Text style={styles.successSub}>
                Attendance recorded for Lecture 14 on {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodBadgeText}>Method: Code</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              </View>
              <PrimaryButton
                title="Done"
                icon="checkmark"
                onPress={handleReturnToClass}
                style={styles.actionBtn}
              />
            </View>
          )}

          {/* 7. NETWORK ERROR STATE */}
          {activeResult === 'network_error' && (
            <View style={styles.resultCard}>
              <ErrorState
                message="Unable to reach server. Please check your network connection and try again."
                onRetry={handleSubmit}
              />
              <SecondaryButton
                title="Cancel"
                onPress={() => setActiveResult(null)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}

          {/* INPUT FORM (Visible unless full success/network error replaces it) */}
          {activeResult !== 'success' && activeResult !== 'network_error' && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Enter Attendance Code</Text>
              <Text style={styles.formSubtitle}>
                Enter the 6-digit numerical code displayed on your teacher's screen.
              </Text>

              {/* 6 Discrete Digit Boxes */}
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={styles.digitsRow}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = codeDigits[index] || '';
                  const isCurrent = index === codeDigits.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.digitBox,
                        isCurrent && styles.digitBoxActive,
                        digit ? styles.digitBoxFilled : null,
                      ]}
                    >
                      <Text style={styles.digitText}>{digit}</Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* Hidden text input capturing numbers */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={styles.hiddenInput}
                accessibilityLabel="Enter 6-digit attendance code"
              />

              {/* 2. WRONG CODE BANNER */}
              {activeResult === 'wrong_code' && (
                <View style={[styles.resultBanner, styles.bannerError]}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Invalid Attendance Code</Text>
                    <Text style={styles.bannerMessage}>
                      The code you entered does not match the active session. Please check with your teacher and try again.
                    </Text>
                  </View>
                </View>
              )}

              {/* 3. EXPIRED BANNER */}
              {activeResult === 'expired' && (
                <View style={[styles.resultBanner, styles.bannerWarning]}>
                  <Ionicons name="time" size={20} color={colors.warning} />
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Session Expired</Text>
                    <Text style={styles.bannerMessage}>
                      This attendance session has ended. Attendance can no longer be recorded with this code.
                    </Text>
                  </View>
                </View>
              )}

              {/* 4. ALREADY MARKED BANNER */}
              {activeResult === 'already_marked' && (
                <View style={[styles.resultBanner, styles.bannerInfo]}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Already Marked</Text>
                    <Text style={styles.bannerMessage}>
                      You have already marked attendance for this session. Your attendance is securely saved.
                    </Text>
                  </View>
                </View>
              )}

              {/* 5. NOT ENROLLED / REMOVED BANNER */}
              {activeResult === 'not_enrolled' && (
                <View style={[styles.resultBanner, styles.bannerError]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Enrollment Issue</Text>
                    <Text style={styles.bannerMessage}>
                      You are not currently enrolled in this class or your enrollment was revoked.
                    </Text>
                  </View>
                </View>
              )}

              {/* 6. RATE LIMITED BANNER */}
              {activeResult === 'rate_limited' && (
                <View style={[styles.resultBanner, styles.bannerWarning]}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.warning} />
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Too Many Attempts</Text>
                    <Text style={styles.bannerMessage}>
                      Rate limit exceeded (maximum 10 attempts per minute). Please wait 60 seconds before trying again.
                    </Text>
                  </View>
                </View>
              )}

              <PrimaryButton
                title="Mark present"
                icon="checkmark"
                loading={loading}
                disabled={code.length !== 6 || loading}
                onPress={handleSubmit}
                style={styles.submitBtn}
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
  demoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  demoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.sm,
    fontWeight: '600',
    fontSize: 11,
  },
  demoPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  demoPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  demoPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  demoPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  classInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  classLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  className: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  classSub: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  digitBox: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  digitBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  digitText: {
    ...typography.display,
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  bannerError: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
  },
  bannerWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  bannerInfo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bannerMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
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
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  successSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  methodBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  methodBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verifiedBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  actionBtn: {
    width: '100%',
  },
});
