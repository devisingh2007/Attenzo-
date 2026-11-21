import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../constants/theme';
import {
  AppHeader,
  InputField,
  PrimaryButton,
} from '../../../../components';
import { INITIAL_MOCK_CLASSES } from '../../../../constants/mockTeacherData';

export default function StartAttendanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const cls = INITIAL_MOCK_CLASSES.find((c) => c.id === id) || INITIAL_MOCK_CLASSES[0];

  const [duration, setDuration] = useState<number>(10);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionActiveError, setSessionActiveError] = useState(false);

  const durationOptions = [5, 10, 15, 30];

  const handleStart = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(teacher)/session/sess_1' as any);
    }, 600);
  };

  const handleViewExistingSession = () => {
    router.replace('/(teacher)/session/sess_1' as any);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Start Attendance"
        onBack={() => router.back()}
      />

      {/* Dev toggle to test active session error */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Dev Test Error:</Text>
        <Pressable
          onPress={() => setSessionActiveError((prev) => !prev)}
          style={[styles.demoPill, sessionActiveError && styles.demoPillActive]}
        >
          <Text style={[styles.demoPillText, sessionActiveError && styles.demoPillTextActive]}>
            {sessionActiveError ? 'SESSION_ALREADY_ACTIVE: ON' : 'SESSION_ALREADY_ACTIVE: OFF'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Class Banner */}
        <View style={styles.classInfoCard}>
          <Text style={styles.classLabel}>CLASS</Text>
          <Text style={styles.className}>{cls.name}</Text>
          <Text style={styles.classCode}>{cls.subjectCode} · {cls.studentCount} Students</Text>
        </View>

        {sessionActiveError ? (
          /* Error Banner for SESSION_ALREADY_ACTIVE */
          <View style={styles.errorCard}>
            <View style={styles.errorIconRow}>
              <Ionicons name="alert-circle" size={28} color={colors.warning} />
              <Text style={styles.errorTitle}>Session Already Active</Text>
            </View>
            <Text style={styles.errorMessage}>
              An attendance session is currently active for this class. You cannot start a new session until the current one ends.
            </Text>
            <PrimaryButton
              title="View Live Session"
              icon="radio-button-on"
              onPress={handleViewExistingSession}
              style={{ marginTop: spacing.md, backgroundColor: colors.warning }}
            />
          </View>
        ) : (
          /* Session Configuration Form */
          <View style={styles.formCard}>
            <Text style={styles.sectionHeading}>Session Duration</Text>
            <Text style={styles.sectionSubtitle}>
              The session code will automatically expire after this period.
            </Text>

            <View style={styles.chipsRow}>
              {durationOptions.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setDuration(opt)}
                  style={[
                    styles.chip,
                    duration === opt && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      duration === opt && styles.chipTextSelected,
                    ]}
                  >
                    {opt} min
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionHeading}>Session Title (Optional)</Text>
            <InputField
              label="Session Title"
              placeholder="e.g. Lecture 14 — Binary Search Trees"
              value={title}
              onChangeText={setTitle}
            />

            <PrimaryButton
              title="Start Session"
              icon="play"
              loading={loading}
              onPress={handleStart}
              style={styles.startButton}
            />
          </View>
        )}
      </ScrollView>
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
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  demoPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  demoPillTextActive: {
    color: colors.warning,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
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
    marginBottom: 4,
  },
  classCode: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  startButton: {
    marginTop: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    ...shadows.card,
  },
  errorIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
