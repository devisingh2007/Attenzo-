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
  SecondaryButton,
  LoadingIndicator,
  ErrorState,
} from '../../../../components';
import {
  INITIAL_STUDENT_CLASSES,
  MockStudentClass,
} from '../../../../constants/mockStudentData';

export default function StudentAttendancePercentageScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const baseCls = INITIAL_STUDENT_CLASSES.find((c) => c.id === id) || INITIAL_STUDENT_CLASSES[0];
  const [cls, setCls] = useState<MockStudentClass>(baseCls);
  const [demoState, setDemoState] = useState<'default' | 'loading' | 'error'>('default');

  const isBelowThreshold = cls.percentage < 75;

  const handleToggleThreshold = () => {
    setCls((prev) => ({
      ...prev,
      percentage: prev.percentage < 75 ? 85.7 : 64.3,
      presentCount: prev.percentage < 75 ? 12 : 9,
      belowThreshold: prev.percentage >= 75,
    }));
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 75) return colors.success;
    if (pct >= 50) return colors.warning;
    return colors.error;
  };

  if (demoState === 'loading') {
    return (
      <View style={styles.container}>
        <AppHeader title="Attendance Percentage" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Computing attendance analytics..." />
        </View>
      </View>
    );
  }

  if (demoState === 'error') {
    return (
      <View style={styles.container}>
        <AppHeader title="Attendance Percentage" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ErrorState
            message="Could not compute attendance statistics. Please try again."
            onRetry={() => setDemoState('default')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Percentage"
        onBack={() => router.back()}
      />

      {/* Dev helper switcher */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Dev Toggle:</Text>
        <Pressable onPress={handleToggleThreshold} style={styles.demoPill}>
          <Text style={styles.demoPillText}>
            Toggle {cls.percentage < 75 ? 'Above 75% (85.7%)' : 'Below 75% (64.3%)'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Class Banner */}
        <View style={styles.classInfoCard}>
          <Text style={styles.classLabel}>CLASS</Text>
          <Text style={styles.className}>{cls.name}</Text>
          <Text style={styles.classSub}>{cls.subjectCode} · {cls.teacherName}</Text>
        </View>

        {/* Main Percentage Display Card */}
        <View style={styles.percentageCard}>
          <Text style={styles.percentageLabel}>OVERALL ATTENDANCE</Text>
          <Text
            style={[
              styles.bigPercentageText,
              { color: getProgressColor(cls.percentage) },
            ]}
          >
            {cls.percentage}%
          </Text>

          {/* Progress Bar with 75% Marker */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, cls.percentage)}%`,
                    backgroundColor: getProgressColor(cls.percentage),
                  },
                ]}
              />
            </View>

            {/* 75% Threshold Guideline Marker */}
            <View style={[styles.markerContainer, { left: '75%' }]}>
              <View style={styles.markerLine} />
              <Text style={styles.markerText}>75% Target</Text>
            </View>
          </View>

          {/* Ratio caption */}
          <Text style={styles.ratioCaption}>
            Attended {cls.presentCount} of {cls.totalSessions} sessions held
          </Text>
        </View>

        {/* Threshold Status Banner (S9 spec: shows warning banner when below 75%) */}
        {isBelowThreshold ? (
          <View style={styles.warningAlertCard}>
            <View style={styles.alertHeaderRow}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <Text style={styles.warningAlertTitle}>Below Mandatory Threshold</Text>
            </View>
            <Text style={styles.warningAlertMessage}>
              Your current attendance ({cls.percentage}%) is below the institutional 75% requirement. Attend upcoming sessions to regain eligibility.
            </Text>
          </View>
        ) : (
          <View style={styles.successAlertCard}>
            <View style={styles.alertHeaderRow}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.successAlertTitle}>In Good Standing</Text>
            </View>
            <Text style={styles.successAlertMessage}>
              Your current attendance ({cls.percentage}%) meets or exceeds the required 75% attendance threshold. Keep it up!
            </Text>
          </View>
        )}

        {/* Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Session Breakdown</Text>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.breakdownLabel}>Total Classes Conducted</Text>
            </View>
            <Text style={styles.breakdownValue}>{cls.totalSessions}</Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.breakdownLabel}>Sessions Present</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.success }]}>
              {cls.presentCount}
            </Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.dot, { backgroundColor: colors.error }]} />
              <Text style={styles.breakdownLabel}>Sessions Absent</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.error }]}>
              {cls.totalSessions - cls.presentCount}
            </Text>
          </View>
        </View>

        <SecondaryButton
          title="View Session-by-Session History"
          icon="time-outline"
          onPress={() => router.push(`/(student)/class/${cls.id}/history` as any)}
          style={styles.historyBtn}
        />
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
    fontSize: 11,
  },
  demoPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
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
  percentageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  percentageLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  bigPercentageText: {
    ...typography.display,
    fontSize: 54,
    fontWeight: '800',
    marginVertical: spacing.xs,
  },
  progressBarWrapper: {
    width: '100%',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  progressBarTrack: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  markerContainer: {
    position: 'absolute',
    top: -6,
    alignItems: 'center',
    transform: [{ translateX: -30 }],
  },
  markerLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.textPrimary,
  },
  markerText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  ratioCaption: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  warningAlertCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  warningAlertTitle: {
    ...typography.h3,
    color: colors.warning,
    fontWeight: '700',
  },
  warningAlertMessage: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  successAlertCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  successAlertTitle: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  successAlertMessage: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  breakdownTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  breakdownValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  historyBtn: {
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
